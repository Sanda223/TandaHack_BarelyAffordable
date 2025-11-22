import prisma from '../lib/prisma';
import { BankStatementAnalysis, HomeCriteria, UserProfile } from '../types';

// Simple password hashing (in production, use bcrypt or similar)
const hashPassword = (password: string): string => {
  if (typeof window !== 'undefined' && window.btoa) {
    try {
      return window.btoa(unescape(encodeURIComponent(password)));
    } catch {
      return window.btoa(password);
    }
  }
  // Node.js environment
  return Buffer.from(password).toString('base64');
};

interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  profile: UserProfile;
  criteria: HomeCriteria;
  bankAnalysis: BankStatementAnalysis | null;
  totalBalance: number;
}

export const createUser = async (payload: CreateUserPayload) => {
  const { fullName, email, password, profile, criteria, bankAnalysis, totalBalance } = payload;

  // Split full name into first and last name
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Determine employment status and income frequency
  const employmentStatus = profile.jobType === 'Salary' ? 'fulltime' : 
                          profile.jobType === 'Hourly' ? 'parttime' :
                          profile.jobType === 'Casual' ? 'casual' : 
                          profile.jobType === 'Contract' ? 'contract' : 'fulltime';
  
  const incomeFrequency = employmentStatus === 'fulltime' ? 'yearly' : 'weekly';
  const incomeAmount = employmentStatus === 'fulltime' 
    ? profile.annualIncome 
    : Math.round(profile.monthlyIncome * 12 / 52); // Convert monthly to weekly for non-fulltime

  // Calculate average spending from bank analysis
  const avgTotalMonthlySpend = bankAnalysis?.monthlyAverageSpend || 0;
  
  // Map expense categories from bank analysis
  const expenseByMacro = bankAnalysis?.expenseByMacro || [];
  const getMacroSpend = (macro: string) => {
    const found = expenseByMacro.find(e => e.macroCategory.toLowerCase() === macro.toLowerCase());
    return found?.averageMonthlySpend || 0;
  };

  const avgHousingSpend = getMacroSpend('Housing');
  const avgTransportSpend = getMacroSpend('Transport');
  const avgFoodSpend = getMacroSpend('Food & Dining');
  const avgUtilitiesSpend = getMacroSpend('Utilities');
  const avgEntertainmentSpend = getMacroSpend('Entertainment');
  const avgHealthcareSpend = getMacroSpend('Healthcare');
  const avgSubscriptionsSpend = getMacroSpend('Subscriptions');
  
  // Calculate other spending
  const categorizedTotal = avgHousingSpend + avgTransportSpend + avgFoodSpend + 
                          avgUtilitiesSpend + avgEntertainmentSpend + avgHealthcareSpend + 
                          avgSubscriptionsSpend;
  const avgOtherSpend = Math.max(0, avgTotalMonthlySpend - categorizedTotal);

  try {
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashPassword(password),
        firstName,
        lastName,
        
        // Employment & Income
        employmentStatus,
        incomeAmount,
        incomeFrequency,
        
        // Savings
        currentSavings: totalBalance,
        savingsGoal: criteria.estimatedPrice ? criteria.estimatedPrice * 0.2 : null, // 20% deposit
        monthlyTarget: bankAnalysis?.monthlyAverageSavings || 0,
        
        // Property Goals
        targetPropertyCity: criteria.location,
        targetPropertyBedrooms: criteria.bedrooms,
        targetPropertyBathrooms: criteria.bathrooms,
        targetPropertyGarage: criteria.garage,
        estimatedPropertyPrice: criteria.estimatedPrice,
        depositTarget: criteria.estimatedPrice ? criteria.estimatedPrice * 0.2 : null,
        
        // Average Spending by Category
        avgTotalMonthlySpend,
        avgHousingSpend,
        avgTransportSpend,
        avgFoodSpend,
        avgUtilitiesSpend,
        avgEntertainmentSpend,
        avgHealthcareSpend,
        avgSubscriptionsSpend,
        avgOtherSpend,
        
        // Hobbies
        hobbies: profile.hobbies || [],
        
        // Bank Analysis Metadata
        lastCsvAnalysisDate: bankAnalysis ? new Date() : null,
        csvMonthsAnalyzed: bankAnalysis ? bankAnalysis.monthsCovered.length : 0,
        
        // Current Balance
        currentBalance: totalBalance,
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error('An account with that email already exists.');
    }
    throw error;
  }
};

export const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  
  if (!user) return null;
  
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  
  if (!user) return null;
  
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const verifyUserPassword = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  
  if (!user) {
    throw new Error('No account found for that email.');
  }
  
  const hashedInput = hashPassword(password);
  if (hashedInput !== user.password) {
    throw new Error('Incorrect password.');
  }
  
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};