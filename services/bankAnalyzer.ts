import {
  BankStatementAnalysis,
  ExpenseCategorySummary,
  IncomeSource,
  MacroCategorySummary,
  MonthlyBreakdown,
  RecurringExpense,
} from '../types';

const RECURRING_MIN_MONTHS = 2;
const RECURRING_MIN_TX = 2;
const AMOUNT_ROUND_DECIMALS = 0;
const LEAKAGE_TOP_N = 10;

const MACRO_CATEGORY_MAP: Record<string, string> = {
  Rent: 'Essential',
  Rego: 'Essential',
  Insurance: 'Essential',
  Utilities: 'Essential',
  Groceries: 'Essential',
  Transport: 'Essential',
  'Phone & Internet': 'Essential',
  Income: 'Income',
  Salary: 'Income',
  'Side gig / Misc': 'Income',
  Subscriptions: 'Lifestyle',
  'Eating Out': 'Lifestyle',
  Parking: 'Lifestyle',
  Shopping: 'Lifestyle',
  Entertainment: 'Lifestyle',
  Unknown: 'Lifestyle',
};

interface StandardisedTransaction {
  date: Date;
  description: string;
  amount: number;
}

interface DerivedTransaction extends StandardisedTransaction {
  monthKey: string;
  isInflow: boolean;
  isOutflow: boolean;
  absAmount: number;
  merchantNorm: string;
  day: number;
  isInternal: boolean;
}

const normaliseMerchant = (value: string): string => {
  if (!value) return 'UNKNOWN';
  let s = value.toUpperCase();
  s = s.replace(/[^A-Z0-9 ]+/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s || 'UNKNOWN';
};

const inferCategory = (merchant: string): string => {
  const value = merchant.toUpperCase();
  if (/(RENT|REALESTATE|REALTY)/.test(value)) return 'Rent';
  if (/(REGISTRATION| REGO|TRANSPORT DEPT)/.test(value)) return 'Rego';
  if (/(INSURANCE|NRMA|AAMI|ALLIANZ)/.test(value)) return 'Insurance';
  if (/(ENERGY|POWER|AGL|ELECTRICITY|WATER|GAS)/.test(value)) return 'Utilities';
  if (/(OPTUS|TELSTRA|VODAFONE|AMAYSIM)/.test(value)) return 'Phone & Internet';
  if (/(UBER|TRANSLINK|GO CARD)/.test(value)) return 'Transport';
  if (/(COLES|WOOLWORTHS|ALDI|IGA|GROCER)/.test(value)) return 'Groceries';
  if (/(MCDONALDS|SUSHI|CAFE|BUTCHER)/.test(value)) return 'Eating Out';
  if (/(NETFLIX|SPOTIFY|APPLECOMBILL|CHATGPT|AMZNPRIME)/.test(value)) return 'Subscriptions';
  if (/(PARKING|WESTFIELD|SHOPPING)/.test(value)) return 'Parking';
  return 'Unknown';
};

const getMacroCategory = (category: string): string => MACRO_CATEGORY_MAP[category] ?? 'Lifestyle';

const isInternalTransfer = (merchant: string): boolean => merchant.includes('TRANSFER');

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const [, part1, part2, part3] = slashMatch;
    const dayFirst = parseInt(part1, 10) > 12;
    const day = dayFirst ? parseInt(part1, 10) : parseInt(part2, 10);
    const month = dayFirst ? parseInt(part2, 10) : parseInt(part1, 10);
    const year = parseInt(part3, 10);
    const normalizedYear = year < 100 ? 2000 + year : year;
    const date = new Date(normalizedYear, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const cleanMoneyValue = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  let str = String(value).trim();
  if (!str) return 0;
  const negative = str.includes('(') && str.includes(')');
  str = str.replace(/[^\d.\-]/g, '');
  const numeric = Number.parseFloat(str);
  if (Number.isNaN(numeric)) return 0;
  return negative ? -Math.abs(numeric) : numeric;
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let current = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushCell = () => {
    currentRow.push(current);
    current = '';
  };

  const pushRow = () => {
    rows.push(currentRow);
    currentRow = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      pushCell();
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      pushCell();
      pushRow();
    } else {
      current += char;
    }
  }
  pushCell();
  if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
    pushRow();
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
};

const rowsToRecords = (rows: string[][]): Record<string, string>[] => {
  if (!rows.length) return [];
  const header = rows[0].map((cell) => cell.trim());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((col, index) => {
      record[col || `column_${index}`] = row[index] ?? '';
    });
    return record;
  });
};

const detectColumn = (recordKeys: string[], keywords: string[]): string | undefined =>
  recordKeys.find((key) => keywords.some((kw) => key.toLowerCase().includes(kw)));

const standardiseRecords = (records: Record<string, string>[], sourceName: string): StandardisedTransaction[] => {
  if (!records.length) return [];
  const columns = Object.keys(records[0]);

  const dateCol = detectColumn(columns, ['date']);
  if (!dateCol) {
    throw new Error(`[${sourceName}] Could not determine date column.`);
  }

  const descCol =
    detectColumn(columns, ['description', 'details', 'narration', 'memo', 'payee', 'merchant', 'reference']) ||
    columns.find((col) => col !== dateCol) ||
    dateCol;

  const amountCols = columns.filter((col) => col.toLowerCase().includes('amount'));
  const indicatorCol = detectColumn(columns, ['dr/cr', 'debit/credit', 'credit/debit', 'dc flag', 'cr/dr']);

  const debitCol = detectColumn(columns, ['debit', 'withdrawal']);
  const creditCol = detectColumn(columns, ['credit', 'deposit']);

  const standardised: StandardisedTransaction[] = [];

  records.forEach((row) => {
    const rawDate = row[dateCol];
    const parsedDate = parseDate(rawDate);
    if (!parsedDate) return;

    const description = row[descCol] ?? '';
    let amount = 0;

    if (amountCols.length > 0) {
      const amtCol = amountCols[0];
      amount = cleanMoneyValue(row[amtCol]);
      if (indicatorCol) {
        const indicator = (row[indicatorCol] || '').toUpperCase();
        if (indicator.includes('DR')) {
          amount = -Math.abs(amount);
        } else if (indicator.includes('CR')) {
          amount = Math.abs(amount);
        }
      }
    } else if (debitCol || creditCol) {
      const debit = debitCol ? cleanMoneyValue(row[debitCol]) : 0;
      const credit = creditCol ? cleanMoneyValue(row[creditCol]) : 0;
      amount = credit - Math.abs(debit);
    } else {
      throw new Error(`[${sourceName}] Could not determine amount columns.`);
    }

    standardised.push({
      date: parsedDate,
      description,
      amount,
    });
  });

  return standardised;
};

const deriveTransactions = (transactions: StandardisedTransaction[]): DerivedTransaction[] =>
  transactions
    .map((tx) => {
      const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const merchantNorm = normaliseMerchant(tx.description);
      return {
        ...tx,
        monthKey,
        isInflow: tx.amount > 0,
        isOutflow: tx.amount < 0,
        absAmount: Math.abs(tx.amount),
        merchantNorm,
        day: tx.date.getDate(),
        isInternal: isInternalTransfer(merchantNorm),
      };
    })
    .filter((tx) => !Number.isNaN(tx.amount) && Number.isFinite(tx.amount));

const summarizeRecurringExpenses = (transactions: DerivedTransaction[]): RecurringExpense[] => {
  const outflows = transactions.filter((tx) => tx.isOutflow && !tx.isInternal);

  const recurringMap = new Map<string, RecurringExpense>();

  outflows.forEach((tx) => {
    const roundedAmount = Number.parseFloat(tx.absAmount.toFixed(AMOUNT_ROUND_DECIMALS));
    const bucketKey = `${tx.merchantNorm}|${roundedAmount}`;
    const category = inferCategory(tx.merchantNorm);
    const macroCategory = getMacroCategory(category);

    if (!recurringMap.has(bucketKey)) {
      recurringMap.set(bucketKey, {
        name: tx.merchantNorm,
        averageAmount: 0,
        category,
        macroCategory,
        transactionCount: 0,
        monthCount: 0,
        estimatedMonthlyCost: 0,
      });
    }

    const entry = recurringMap.get(bucketKey)!;
    entry.transactionCount += 1;
    entry.averageAmount += tx.absAmount;
    entry.monthCount = new Set([...(entry.monthCount ? Array.from(Array(entry.monthCount).keys()) : []), tx.monthKey]).size;
  });

  const recurring = Array.from(recurringMap.values())
    .map((entry) => ({
      ...entry,
      averageAmount: entry.transactionCount > 0 ? entry.averageAmount / entry.transactionCount : 0,
    }))
    .filter((entry) => entry.transactionCount >= RECURRING_MIN_TX && entry.monthCount >= RECURRING_MIN_MONTHS)
    .map((entry) => ({
      ...entry,
      estimatedMonthlyCost: entry.averageAmount,
    }))
    .sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost);

  return recurring;
};

const summarizeByCategory = (
  transactions: DerivedTransaction[],
  getValue: (tx: DerivedTransaction) => number,
): ExpenseCategorySummary[] => {
  const outflows = transactions.filter((tx) => tx.isOutflow && !tx.isInternal);
  const summaryMap = new Map<string, ExpenseCategorySummary>();

  outflows.forEach((tx) => {
    const category = inferCategory(tx.merchantNorm);
    const macroCategory = getMacroCategory(category);
    if (!summaryMap.has(category)) {
      summaryMap.set(category, {
        category,
        macroCategory,
        totalSpend: 0,
        monthCount: 0,
        averageMonthlySpend: 0,
      });
    }
    const entry = summaryMap.get(category)!;
    entry.totalSpend += Math.abs(getValue(tx));
    entry.monthCount = new Set([...(entry.monthCount ? Array.from(Array(entry.monthCount).keys()) : []), tx.monthKey]).size;
  });

  return Array.from(summaryMap.values()).map((entry) => ({
    ...entry,
    averageMonthlySpend: entry.monthCount ? entry.totalSpend / entry.monthCount : entry.totalSpend,
  }));
};

const summarizeByMacroCategory = (categories: ExpenseCategorySummary[]): MacroCategorySummary[] => {
  const summaryMap = new Map<string, MacroCategorySummary>();

  categories.forEach((category) => {
    if (!summaryMap.has(category.macroCategory)) {
      summaryMap.set(category.macroCategory, {
        macroCategory: category.macroCategory,
        totalSpend: 0,
        monthCount: 0,
        averageMonthlySpend: 0,
      });
    }
    const entry = summaryMap.get(category.macroCategory)!;
    entry.totalSpend += category.totalSpend;
    entry.monthCount = Math.max(entry.monthCount, category.monthCount);
  });

  return Array.from(summaryMap.values()).map((entry) => ({
    ...entry,
    averageMonthlySpend: entry.monthCount ? entry.totalSpend / entry.monthCount : entry.totalSpend,
  }));
};

const summarizeIncome = (transactions: DerivedTransaction[]): IncomeSource[] => {
  const inflows = transactions.filter((tx) => tx.isInflow && !tx.isInternal);
  const summaryMap = new Map<string, IncomeSource>();

  inflows.forEach((tx) => {
    const category = inferCategory(tx.merchantNorm);
    const macroCategory = getMacroCategory(category);
    if (!summaryMap.has(tx.merchantNorm)) {
      summaryMap.set(tx.merchantNorm, {
        name: tx.merchantNorm,
        totalAmount: 0,
        averageAmount: 0,
        transactionCount: 0,
        monthCount: 0,
        averageMonthlyAmount: 0,
        type: category === 'Unknown' ? 'Income' : category,
        macroCategory,
      });
    }
    const entry = summaryMap.get(tx.merchantNorm)!;
    entry.totalAmount += tx.amount;
    entry.transactionCount += 1;
    entry.monthCount = new Set([...(entry.monthCount ? Array.from(Array(entry.monthCount).keys()) : []), tx.monthKey]).size;
  });

  return Array.from(summaryMap.values()).map((entry) => ({
    ...entry,
    averageAmount: entry.transactionCount ? entry.totalAmount / entry.transactionCount : entry.totalAmount,
    averageMonthlyAmount: entry.monthCount ? entry.totalAmount / entry.monthCount : entry.totalAmount,
  }));
};

const summarizeMonthly = (transactions: DerivedTransaction[]): MonthlyBreakdown[] => {
  const months = Array.from(new Set(transactions.map((tx) => tx.monthKey))).sort();
  return months.map((month) => {
    const monthTx = transactions.filter((tx) => tx.monthKey === month);
    const totalInflow = monthTx.filter((tx) => tx.isInflow && !tx.isInternal).reduce((sum, tx) => sum + tx.amount, 0);
    const totalOutflow = monthTx.filter((tx) => tx.isOutflow && !tx.isInternal).reduce((sum, tx) => sum + tx.absAmount, 0);
    const savings = totalInflow - totalOutflow;
    return {
      month,
      totalInflow,
      totalOutflow,
      savings,
      transactionCount: monthTx.length,
    };
  });
};

const summarizeLeakage = (recurring: RecurringExpense[]): RecurringExpense[] => {
  const leakage = [...recurring].sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost);
  return leakage.slice(0, LEAKAGE_TOP_N);
};

const summarizeKpis = (
  breakdown: MonthlyBreakdown[],
  recurring: RecurringExpense[],
  incomeSources: IncomeSource[],
  macroSpend: MacroCategorySummary[],
) => {
  const monthsCovered = breakdown.map((b) => b.month);
  const monthlyAverageSpend =
    breakdown.reduce((sum, b) => sum + b.totalOutflow, 0) / (breakdown.length || 1);
  const monthlyAverageSavings =
    breakdown.reduce((sum, b) => sum + b.savings, 0) / (breakdown.length || 1);
  const totalAverageMonthlyIncome =
    breakdown.reduce((sum, b) => sum + b.totalInflow, 0) / (breakdown.length || 1);
  const totalTransactions = breakdown.reduce((sum, b) => sum + b.transactionCount, 0);
  const totalInflowTransactions = incomeSources.reduce((sum, src) => sum + src.transactionCount, 0);
  const totalOutflowTransactions = totalTransactions - totalInflowTransactions;

  return {
    monthsCovered,
    monthlyAverageSpend,
    monthlyAverageSavings,
    totalTransactions,
    totalInflowTransactions,
    totalOutflowTransactions,
    totalAverageMonthlyIncome,
    recurringEssential: recurring.filter((r) => r.macroCategory === 'Essential'),
    recurringLifestyle: recurring.filter((r) => r.macroCategory === 'Lifestyle'),
    leakageHotspots: summarizeLeakage(recurring),
    expenseByMacro: macroSpend,
  };
};

export const analyzeBankStatements = async (
  files: File[],
  {
    employerHint,
    employmentType,
  }: {
    employerHint?: string;
    employmentType?: string;
  } = {},
): Promise<BankStatementAnalysis> => {
  const fileContents = await Promise.all(files.map((file) => file.text()));
  const allRows: string[][] = [];

  fileContents.forEach((text) => {
    allRows.push(...parseCsv(text));
  });

  const records = rowsToRecords(allRows);
  const standardised = standardiseRecords(records, 'Uploaded CSVs');
  const derived = deriveTransactions(standardised);

  const recurring = summarizeRecurringExpenses(derived);
  const categories = summarizeByCategory(derived, (tx) => tx.amount);
  const macroCategories = summarizeByMacroCategory(categories);
  const income = summarizeIncome(derived);
  const monthlyBreakdown = summarizeMonthly(derived);
  const kpis = summarizeKpis(monthlyBreakdown, recurring, income, macroCategories);

  let inferredEmployer: string | undefined;
  if (employerHint) {
    inferredEmployer = employerHint;
  } else if (employmentType?.toLowerCase().includes('full')) {
    inferredEmployer = income.find((src) => src.type === 'Income')?.name;
  }

  return {
    recurringExpenses: recurring,
    monthlyBreakdown,
    incomeSources: income,
    expenseByCategory: categories,
    expenseByMacro: macroCategories,
    totalAverageMonthlyIncome: kpis.totalAverageMonthlyIncome,
    monthlyAverageSavings: kpis.monthlyAverageSavings,
    monthlyAverageSpend: kpis.monthlyAverageSpend,
    totalTransactions: kpis.totalTransactions,
    totalInflowTransactions: kpis.totalInflowTransactions,
    totalOutflowTransactions: kpis.totalOutflowTransactions,
    recurringEssential: kpis.recurringEssential,
    recurringLifestyle: kpis.recurringLifestyle,
    leakageHotspots: kpis.leakageHotspots,
    monthsCovered: kpis.monthsCovered,
    startDate: monthlyBreakdown[0]?.month ?? '',
    endDate: monthlyBreakdown[monthlyBreakdown.length - 1]?.month ?? '',
    inference: {
      employer: inferredEmployer,
      employmentType: employmentType || '',
    },
  };
};
