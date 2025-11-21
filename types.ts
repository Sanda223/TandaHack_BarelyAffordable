export enum Page {
  Dashboard = 'Dashboard',
  Learning = 'Learning',
  Simulator = 'Simulator',
  Profile = 'Profile',
  Settings = 'Settings',
  Insights = 'Insights',
  SignIn = 'SignIn',
  SignUp = 'SignUp',
  FinancialReport = 'FinancialReport',
}

export interface UserProfile {
  jobTitle: string;
  jobType: 'Salary' | 'Hourly' | 'Contract' | 'Casual' | '';
  monthlyIncome: number;
  annualIncome: number;
  hobbies: string[];
  skills: string[];
}

export interface MonthlyBreakdown {
  month: string;
  totalInflow: number;
  totalOutflow: number;
  savings: number;
  transactionCount: number;
}

export interface RecurringExpense {
  name: string;
  averageAmount: number;
  category: string;
  macroCategory: string;
  transactionCount: number;
  monthCount: number;
  estimatedMonthlyCost: number;
  amount?: number; // compatibility with older UI
}

export interface MacroCategorySummary {
  macroCategory: string;
  totalSpend: number;
  monthCount: number;
  averageMonthlySpend: number;
}

export interface ExpenseCategorySummary {
  category: string;
  macroCategory: string;
  totalSpend: number;
  monthCount: number;
  averageMonthlySpend: number;
}

export interface IncomeSource {
  name: string;
  totalAmount: number;
  averageAmount: number;
  transactionCount: number;
  monthCount: number;
  averageMonthlyAmount: number;
  type: string;
  macroCategory: string;
}

export interface BankStatementAnalysis {
  monthlyAverageSpend: number;
  monthlyAverageSavings: number;
  recurringExpenses: RecurringExpense[];
  monthlyBreakdown: MonthlyBreakdown[];
  incomeSources: IncomeSource[];
  totalTransactions: number;
  totalInflowTransactions: number;
  totalOutflowTransactions: number;
  totalAverageMonthlyIncome: number;
  expenseByMacro: MacroCategorySummary[];
  expenseByCategory: ExpenseCategorySummary[];
  recurringEssential: RecurringExpense[];
  recurringLifestyle: RecurringExpense[];
  leakageHotspots: RecurringExpense[];
  monthsCovered: string[];
  startDate: string;
  endDate: string;
  inference?: {
    employer?: string;
    employmentType?: string;
  };
}

export interface HomeCriteria {
  bedrooms: number;
  bathrooms: number;
  location: string;
  garage: boolean;
  propertyType: 'House' | 'Apartment' | 'Townhouse' | '';
  isFirstHomeBuyer: boolean;
  estimatedPrice: number;
  autoEstimate: boolean;
}

export interface LearningItem {
  id: string;
  title: string;
  emoji: string;
  content: string;
  completed: boolean;
}

export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  criteria: HomeCriteria;
  bankAnalysis: BankStatementAnalysis | null;
  totalBalance: number | null;
  createdAt: string;
}

export type PublicUser = Omit<StoredUser, 'passwordHash'>;
