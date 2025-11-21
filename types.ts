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

export interface BankStatementAnalysis {
  monthlyAverageSpend: number;
  monthlyAverageSavings: number;
  recurringExpenses: { name: string; amount: number }[];
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
