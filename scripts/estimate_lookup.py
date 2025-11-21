#!/usr/bin/env python3
"""
Quick helper to query property_estimates_au.csv for an estimated price.

Usage:
  python scripts/estimate_lookup.py --city Sydney --bedrooms 3 --bathrooms 2 --garage yes
"""

import argparse
import csv
from pathlib import Path
from typing import Optional, List, Dict

CSV_PATH = Path(__file__).resolve().parent.parent / "public" / "property_estimates_au.csv"


def load_rows(path: Path) -> List[Dict[str, str]]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def normalize_city(city: str) -> str:
    return city.strip().upper()


def find_estimate(city: str, bedrooms: int, bathrooms: int, garage: bool, rows: List[Dict[str, str]]) -> Optional[int]:
    city_key = normalize_city(city)

    def matches(row, require_garage: bool, require_beds: bool, require_baths: bool) -> bool:
        if normalize_city(row["city"]) != city_key:
            return False
        if require_beds and int(row["bedrooms"]) != bedrooms:
            return False
        if require_baths and int(row["bathrooms"]) != bathrooms:
            return False
        if require_garage and ((row["has_garage"] == "1") != garage):
            return False
        return True

    # Best to weakest match
    for req_g, req_b, req_ba in [
        (True, True, True),   # exact match
        (False, True, True),  # ignore garage
        (False, True, False), # ignore garage/bathroom
        (False, False, False) # city only
    ]:
        for row in rows:
            if matches(row, req_g, req_b, req_ba):
                return int(row["estimated_price_aud"])
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Lookup estimated property price from CSV.")
    parser.add_argument("--city", required=True, help="City (e.g., Sydney, Melbourne)")
    parser.add_argument("--bedrooms", type=int, required=True, help="Number of bedrooms")
    parser.add_argument("--bathrooms", type=int, required=True, help="Number of bathrooms")
    parser.add_argument("--garage", choices=["yes", "no", "true", "false", "1", "0"], required=True, help="Has garage")
    parser.add_argument("--csv", type=Path, default=CSV_PATH, help="Path to property_estimates_au.csv")
    args = parser.parse_args()

    has_garage = args.garage.lower() in {"yes", "true", "1"}
    rows = load_rows(args.csv)
    estimate = find_estimate(args.city, args.bedrooms, args.bathrooms, has_garage, rows)

    if estimate is None:
        print("No estimate found for the provided inputs.")
    else:
        print(f"Estimated price: ${estimate:,}")


if __name__ == "__main__":
    main()
