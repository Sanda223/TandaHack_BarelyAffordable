import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

# ---------- CONFIG ----------

RECURRING_MIN_MONTHS = 2
RECURRING_MIN_TX = 2
AMOUNT_ROUND_DECIMALS = 0  # group recurring charges by rounded dollar amount
LEAKAGE_TOP_N = 10         # how many lifestyle hotspots to surface

# Micro categories -> macro buckets
MACRO_CATEGORY_MAP = {
    "Rent": "Essential",
    "Rego": "Essential",
    "Insurance": "Essential",
    "Utilities": "Essential",
    "Groceries": "Essential",
    "Transport": "Essential",
    "Phone & Internet": "Essential",

    "Subscriptions": "Lifestyle",
    "Eating Out": "Lifestyle",
    "Parking": "Lifestyle",
    "Shopping": "Lifestyle",
    "Entertainment": "Lifestyle",

    "Income": "Income",
    "Salary": "Income",
    "Side gig / Misc": "Income",
}


# ---------- HELPERS ----------

def normalise_merchant(desc: str) -> str:
    """Normalise merchant/description for grouping."""
    if not isinstance(desc, str):
        return "UNKNOWN"
    s = desc.upper()
    s = re.sub(r"[^A-Z0-9 ]+", "", s)  # remove punctuation
    s = re.sub(r"\s+", " ", s).strip()
    return s or "UNKNOWN"


def infer_category(merchant: str) -> str:
    """
    Micro category for expenses based on merchant keywords.
    This is *expense-side* only (income is handled separately).
    """
    merchant = merchant.upper()

    # Hard categories
    if any(x in merchant for x in ["RENT", "REALESTATE", "REALTY"]):
        return "Rent"
    if any(x in merchant for x in ["REGISTRATION", " REGO", "TRANSPORT DEPT"]):
        return "Rego"
    if any(x in merchant for x in ["INSURANCE", "NRMA", "AAMI", "ALLIANZ"]):
        return "Insurance"
    if any(x in merchant for x in ["ENERGY", "POWER", "AGL", "ELECTRICITY", "WATER", "GAS"]):
        return "Utilities"
    if any(x in merchant for x in ["OPTUS", "TELSTRA", "VODAFONE", "AMAYSIM"]):
        return "Phone & Internet"
    if any(x in merchant for x in ["UBER", "TRANSLINK", "GO CARD"]):
        return "Transport"
    if any(x in merchant for x in ["COLES", "WOOLWORTHS", "ALDI", "IGA", "GROCER"]):
        return "Groceries"
    if any(x in merchant for x in ["MCDONALDS", "SUSHI", "CAFE", "BUTCHER"]):
        return "Eating Out"
    if any(x in merchant for x in ["NETFLIX", "SPOTIFY", "APPLECOMBILL", "CHATGPT", "AMZNPRIME"]):
        return "Subscriptions"
    if any(x in merchant for x in ["PARKING", "WESTFIELD", "SHOPPING"]):
        return "Parking"

    return "Unknown"


def clean_money_series(s: pd.Series) -> pd.Series:
    """
    Convert strings like '$1,234.56', '+$20', '($15.00)' into floats.
    Empty or invalid -> 0.0
    """
    s = (
        s.fillna("0")
         .astype(str)
         .str.strip()
    )

    # Mark negatives given as parentheses: (123.45) -> -123.45
    negative_mask = s.str.contains(r"\(") & s.str.contains(r"\)")

    # Remove everything except digits, dot, minus
    s = s.str.replace(r"[^\d\.\-]", "", regex=True)

    s = pd.to_numeric(s, errors="coerce").fillna(0.0)
    s[negative_mask] = -s[negative_mask]
    return s


def is_internal_transfer(merchant_norm: str) -> bool:
    """
    Detect internal account transfers that should NOT be treated as
    income or spending (just moving money between own accounts).

    For this app, anything with 'TRANSFER' in the normalised merchant
    is treated as internal.
    """
    if not isinstance(merchant_norm, str):
        return False
    m = merchant_norm.upper()
    return "TRANSFER" in m


def standardise_statement_df(df: pd.DataFrame, source_name: str) -> pd.DataFrame:
    """
    Normalise a raw bank CSV into:
      - date (datetime)
      - description (str)
      - amount (float, +ve inflow, -ve outflow)

    Supports:
      - Single 'Amount' column (optionally with DR/CR indicator)
      - Separate 'Debit' and 'Credit' columns
      - Flexible header names / casing.
    """
    cols_lower = {c.lower(): c for c in df.columns}

    # --------- 1. DATE column detection ---------
    date_col = None
    for c in df.columns:
        cl = c.lower()
        if "date" in cl:
            date_col = c
            break
    if date_col is None:
        raise KeyError(
            f"[{source_name}] Could not find a date column. Columns were: {list(df.columns)}"
        )

    # --------- 2. DESCRIPTION column detection ---------
    desc_col = None
    for c in df.columns:
        cl = c.lower()
        if any(k in cl for k in ["description", "details", "narration", "memo", "payee", "merchant", "reference"]):
            desc_col = c
            break
    if desc_col is None:
        # Fallback: first non-date column
        for c in df.columns:
            if c != date_col:
                desc_col = c
                break

    # --------- 3. AMOUNT logic ---------
    amount_series = None

    # Case A: single 'amount' type column
    amount_like_cols = [c for c in df.columns if "amount" in c.lower()]
    indicator_col = None
    for c in df.columns:
        cl = c.lower()
        if any(k in cl for k in ["dr/cr", "debit/credit", "dc flag", "credit/debit", "cr/dr"]):
            indicator_col = c
            break

    if amount_like_cols:
        # Use first amount-like column
        amt_col = amount_like_cols[0]
        amount_series = clean_money_series(df[amt_col])

        # If there's a separate indicator column, adjust sign accordingly
        if indicator_col is not None:
            ind = df[indicator_col].astype(str).str.upper().str.strip()
            # 'DR' = debit (negative), 'CR' = credit (positive)
            debit_mask = ind.str.contains("DR")
            credit_mask = ind.str.contains("CR")
            amount_series[debit_mask] = -amount_series[debit_mask].abs()
            amount_series[credit_mask] = amount_series[credit_mask].abs()

    else:
        # Case B: separate Debit / Credit columns
        debit_col = None
        credit_col = None
        for c in df.columns:
            cl = c.lower()
            if "debit" in cl or "withdrawal" in cl:
                debit_col = c
            if "credit" in cl or "deposit" in cl:
                credit_col = c

        if debit_col is None and credit_col is None:
            raise KeyError(
                f"[{source_name}] Could not find amount, debit, or credit columns. "
                f"Columns were: {list(df.columns)}"
            )

        debit_vals = clean_money_series(df[debit_col]) if debit_col else 0.0
        credit_vals = clean_money_series(df[credit_col]) if credit_col else 0.0
        amount_series = credit_vals - debit_vals  # inflow − outflow

    # --------- 4. Build standardised DataFrame ---------
    out = pd.DataFrame()
    out["date"] = pd.to_datetime(df[date_col], dayfirst=True, errors="coerce")
    out["description"] = df[desc_col].astype(str)
    out["amount"] = amount_series

    # Drop rows with no valid date
    out = out[out["date"].notna()].copy()

    return out


# ---------- CORE PIPELINE ----------

def _load_and_standardise(csv_path: Path) -> pd.DataFrame:
    raw = pd.read_csv(csv_path)
    return standardise_statement_df(raw, source_name=str(csv_path))


def load_statements_from_files(files: List[str]) -> pd.DataFrame:
    """
    Load the provided CSV files (expects exactly 3) and combine them.
    Normalises each CSV to: date, description, amount.
    """
    if len(files) != 3:
        raise ValueError(f"Expected exactly 3 CSV files, got {len(files)}.")

    dfs = []
    for file_path in files:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"CSV not found: {file_path}")
        norm = _load_and_standardise(path)
        dfs.append(norm)

    data = pd.concat(dfs, ignore_index=True)

    # Derived fields used by the rest of the pipeline
    data["month_key"] = data["date"].dt.to_period("M").astype(str)
    data["is_inflow"] = data["amount"] > 0
    data["is_outflow"] = data["amount"] < 0
    data["abs_amount"] = data["amount"].abs()
    data["merchant_norm"] = data["description"].apply(normalise_merchant)
    data["day"] = data["date"].dt.day

    return data


def compute_monthly_summary(data: pd.DataFrame) -> Dict[str, Any]:
    """Compute per-month inflow, outflow, savings, and averages."""
    # Exclude internal transfers from cashflow stats
    mask_internal = data["merchant_norm"].apply(is_internal_transfer)

    inflows = (
        data[data["is_inflow"] & ~mask_internal]
        .groupby("month_key")["amount"]
        .sum()
        .rename("total_inflow")
    )

    outflows = (
        data[data["is_outflow"] & ~mask_internal]
        .groupby("month_key")["abs_amount"]
        .sum()
        .rename("total_outflow")
    )

    monthly = pd.concat([inflows, outflows], axis=1).fillna(0)
    monthly["savings"] = monthly["total_inflow"] - monthly["total_outflow"]

    avg_monthly_savings = monthly["savings"].mean()
    avg_monthly_spend = monthly["total_outflow"].mean()

    tx_counts = data.groupby("month_key")["amount"].count().rename("tx_count")
    monthly = monthly.join(tx_counts)

    return {
        "monthly_breakdown": monthly.reset_index().to_dict(orient="records"),
        "average_monthly_savings": float(avg_monthly_savings),
        "average_monthly_spend": float(avg_monthly_spend),
    }


def detect_recurring_expenses(data: pd.DataFrame) -> List[Dict[str, Any]]:
    """Find recurring expenses by merchant + approx amount."""
    outflows = data[data["is_outflow"]].copy()
    if outflows.empty:
        return []

    # Remove internal transfers from recurring expense detection
    outflows = outflows[~outflows["merchant_norm"].apply(is_internal_transfer)]

    outflows["rounded_amount"] = outflows["abs_amount"].round(AMOUNT_ROUND_DECIMALS)

    grouped = (
        outflows
        .groupby(["merchant_norm", "rounded_amount"])
        .agg(
            tx_count=("amount", "count"),
            month_count=("month_key", pd.Series.nunique),
            avg_amount=("abs_amount", "mean"),
            avg_day=("day", "mean"),
        )
        .reset_index()
    )

    recurring = grouped[
        (grouped["month_count"] >= RECURRING_MIN_MONTHS)
        & (grouped["tx_count"] >= RECURRING_MIN_TX)
    ].copy()

    # Micro + macro categories
    recurring["category"] = recurring["merchant_norm"].apply(infer_category)
    recurring["macro_category"] = recurring["category"].map(
        lambda x: MACRO_CATEGORY_MAP.get(x, "Lifestyle")  # default to Lifestyle if unknown
    )

    # Estimated monthly cost = (avg_amount * tx_count) / months_it_appeared
    recurring["estimated_monthly_cost"] = (
        recurring["avg_amount"] * recurring["tx_count"] / recurring["month_count"].clip(lower=1)
    )

    # Convert to plain dicts
    records: List[Dict[str, Any]] = []
    for _, row in recurring.iterrows():
        records.append({
            "merchant": row["merchant_norm"],
            "rounded_amount": float(row["rounded_amount"]),
            "tx_count": int(row["tx_count"]),
            "month_count": int(row["month_count"]),
            "avg_amount": float(row["avg_amount"]),
            "avg_day": float(row["avg_day"]),
            "category": row["category"],
            "macro_category": row["macro_category"],
            "estimated_monthly_cost": float(row["estimated_monthly_cost"]),
        })

    return records


def summarise_income_sources(data: pd.DataFrame, employer_keyword: str = "") -> Dict[str, Any]:
    """
    Group and classify income sources (salary vs side gigs etc.).
    Uses employer_keyword to recognise the main salary stream.
    """
    inflows = data[data["is_inflow"]].copy()
    if inflows.empty:
        return {"sources": [], "total_avg_monthly_income": 0.0}

    # Drop internal transfers as an "income source"
    inflows = inflows[~inflows["merchant_norm"].apply(is_internal_transfer)]

    grouped = (
        inflows
        .groupby("merchant_norm")
        .agg(
            tx_count=("amount", "count"),
            month_count=("month_key", pd.Series.nunique),
            total_amount=("amount", "sum"),
            avg_amount=("amount", "mean"),
        )
        .reset_index()
    )

    employer_keyword = employer_keyword.upper().strip()

    def classify_income(row):
        name = row["merchant_norm"]

        # If employer keyword appears, treat as salary
        if employer_keyword and employer_keyword in name:
            return "Salary"

        # Normal salary heuristics
        if (
            ("DIRECT CREDIT" in name or "PAYROLL" in name or "SALARY" in name)
            and row["month_count"] >= 2
            and row["tx_count"] >= 2
            and row["total_amount"] >= 3000
        ):
            return "Salary"

        if row["avg_amount"] < 1000 and row["tx_count"] >= 1:
            return "Side gig / Misc"

        return "Other income"

    grouped["income_type"] = grouped.apply(classify_income, axis=1)

    # Compute per-source avg monthly income
    sources: List[Dict[str, Any]] = []
    for _, row in grouped.iterrows():
        monthly_amount = float(row["total_amount"]) / max(int(row["month_count"]), 1)
        sources.append({
            "merchant": row["merchant_norm"],
            "tx_count": int(row["tx_count"]),
            "month_count": int(row["month_count"]),
            "total_amount": float(row["total_amount"]),
            "avg_amount": float(row["avg_amount"]),
            "avg_monthly_amount": monthly_amount,
            "income_type": row["income_type"],
            "macro_category": "Income",
        })

    total_avg_monthly_income = sum(s["avg_monthly_amount"] for s in sources)

    return {
        "sources": sources,
        "total_avg_monthly_income": total_avg_monthly_income,
    }


def summarise_expenses(data: pd.DataFrame, recurring_expenses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Summarise expenses into macro/micro categories + leakage hotspots.
    """
    outflows = data[data["is_outflow"]].copy()
    if outflows.empty:
        return {
            "by_macro_category": [],
            "by_category": [],
            "recurring_essential": [],
            "recurring_lifestyle": [],
            "leakage_hotspots": [],
        }

    # Remove internal transfers from expenses
    outflows = outflows[~outflows["merchant_norm"].apply(is_internal_transfer)]

    outflows["category"] = outflows["merchant_norm"].apply(infer_category)
    outflows["macro_category"] = outflows["category"].map(
        lambda x: MACRO_CATEGORY_MAP.get(x, "Unknown")
    )

    # Sum by macro category
    macro_group = (
        outflows
        .groupby("macro_category")
        .agg(
            total_spend=("abs_amount", "sum"),
            month_count=("month_key", pd.Series.nunique),
        )
        .reset_index()
    )

    macro_records: List[Dict[str, Any]] = []
    for _, row in macro_group.iterrows():
        avg_monthly = float(row["total_spend"]) / max(int(row["month_count"]), 1)
        macro_records.append({
            "macro_category": row["macro_category"],
            "total_spend": float(row["total_spend"]),
            "month_count": int(row["month_count"]),
            "avg_monthly_spend": avg_monthly,
        })

    # Sum by micro category
    cat_group = (
        outflows
        .groupby("category")
        .agg(
            total_spend=("abs_amount", "sum"),
            month_count=("month_key", pd.Series.nunique),
        )
        .reset_index()
    )

    cat_records: List[Dict[str, Any]] = []
    for _, row in cat_group.iterrows():
        avg_monthly = float(row["total_spend"]) / max(int(row["month_count"]), 1)
        cat_records.append({
            "category": row["category"],
            "macro_category": MACRO_CATEGORY_MAP.get(row["category"], "Unknown"),
            "total_spend": float(row["total_spend"]),
            "month_count": int(row["month_count"]),
            "avg_monthly_spend": avg_monthly,
        })

    # Recurring essential vs lifestyle from recurring_expenses list
    recurring_essential = [
        r for r in recurring_expenses if r["macro_category"] == "Essential"
    ]
    recurring_lifestyle = [
        r for r in recurring_expenses if r["macro_category"] == "Lifestyle"
    ]

    # Leakage hotspots = top lifestyle recurring by estimated monthly cost
    leakage_hotspots = sorted(
        recurring_lifestyle,
        key=lambda r: r["estimated_monthly_cost"],
        reverse=True
    )[:LEAKAGE_TOP_N]

    return {
        "by_macro_category": macro_records,
        "by_category": cat_records,
        "recurring_essential": recurring_essential,
        "recurring_lifestyle": recurring_lifestyle,
        "leakage_hotspots": leakage_hotspots,
    }


def analyse_bank_statements(files: List[str], employer_keyword: str = "") -> Dict[str, Any]:
    """
    Main entry: analyse the provided CSV files and return
    a frontend-friendly JSON structure.
    """
    data = load_statements_from_files(files)

    monthly_summary = compute_monthly_summary(data)
    recurring_expenses = detect_recurring_expenses(data)
    income_summary = summarise_income_sources(data, employer_keyword)
    expense_summary = summarise_expenses(data, recurring_expenses)

    months = sorted(data["month_key"].unique())
    start_date = data["date"].min()
    end_date = data["date"].max()

    overall = {
        "total_transactions": int(len(data)),
        "total_inflow_transactions": int(data["is_inflow"].sum()),
        "total_outflow_transactions": int(data["is_outflow"].sum()),
        "months_covered": months,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
    }

    result = {
        "meta": overall,
        "cashflow": {
            "average_monthly_savings": monthly_summary["average_monthly_savings"],
            "average_monthly_spend": monthly_summary["average_monthly_spend"],
            "months": monthly_summary["monthly_breakdown"],
        },
        "income": income_summary,
        "expenses": expense_summary,
        # You can expose raw recurring list separately if the UI wants it
        "recurring_expenses_raw": recurring_expenses,
    }

    return result


# ---------- EXAMPLE USAGE (CLI / local testing) ----------

def main():
    parser = argparse.ArgumentParser(
        description="Analyze up to three bank statement CSV files and emit grouped insights as JSON.",
    )
    parser.add_argument(
        "files",
        nargs="+",
        help="Paths to CSV files (ideally one per month). Only the first three will be used.",
    )
    parser.add_argument(
        "--employer",
        default="",
        help="Optional employer/company keyword to better classify income sources.",
    )
    parser.add_argument(
        "--output",
        default="-",
        help="Output path for JSON (default: stdout). Use '-' for stdout.",
    )
    args = parser.parse_args()

    file_list = [str(Path(p).expanduser()) for p in args.files][:3]
    summary = analyse_bank_statements(file_list, employer_keyword=args.employer)
    output_json = json.dumps(summary, indent=2)

    if args.output == "-" or args.output.lower() == "stdout":
        print(output_json)
    else:
        Path(args.output).write_text(output_json)
        print(f"Wrote analysis to {args.output}")


if __name__ == "__main__":
    sys.exit(main())
