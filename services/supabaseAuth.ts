import { supabase } from '../lib/supabase';
import { BankStatementAnalysis, HomeCriteria, PublicUser, UserProfile } from '../types';

interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  profile: UserProfile;
  criteria: HomeCriteria;
  bankAnalysis: BankStatementAnalysis | null;
  totalBalance: number;
}

export const registerUserWithSupabase = async (payload: CreateUserPayload): Promise<PublicUser> => {
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
    // First, sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        }
      }
    });

    if (authError) {
      // Handle rate limit error
      if (authError.message.includes('email_send_rate_limit')) {
        throw new Error('Too many signup attempts. Please wait a moment and try again.');
      }
      throw authError;
    }
    if (!authData.user) throw new Error('Failed to create user');

    // Then insert the user data into the users table
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        password: '', // We don't store password in our table since Supabase Auth handles it
        firstName: firstName,
        lastName: lastName,
        updatedAt: new Date().toISOString(),
        
        // Employment & Income
        employmentStatus: employmentStatus,
        incomeAmount: incomeAmount,
        incomeFrequency: incomeFrequency,
        
        // Savings
        currentSavings: totalBalance,
        savingsGoal: criteria.estimatedPrice ? criteria.estimatedPrice * 0.2 : null,
        monthlyTarget: bankAnalysis?.monthlyAverageSavings || 0,
        
        // Property Goals
        targetPropertyCity: criteria.location,
        targetPropertyBedrooms: criteria.bedrooms,
        targetPropertyBathrooms: criteria.bathrooms,
        targetPropertyGarage: criteria.garage,
        estimatedPropertyPrice: criteria.estimatedPrice,
        depositTarget: criteria.estimatedPrice ? criteria.estimatedPrice * 0.2 : null,
        
        // Average Spending
        avgTotalMonthlySpend: avgTotalMonthlySpend,
        avgHousingSpend: avgHousingSpend,
        avgTransportSpend: avgTransportSpend,
        avgFoodSpend: avgFoodSpend,
        avgUtilitiesSpend: avgUtilitiesSpend,
        avgEntertainmentSpend: avgEntertainmentSpend,
        avgHealthcareSpend: avgHealthcareSpend,
        avgSubscriptionsSpend: avgSubscriptionsSpend,
        avgOtherSpend: avgOtherSpend,
        
        // Hobbies
        hobbies: profile.hobbies || [],
        
        // Bank Analysis Metadata
        lastCsvAnalysisDate: bankAnalysis ? new Date().toISOString() : null,
        csvMonthsAnalyzed: bankAnalysis ? bankAnalysis.monthsCovered.length : 0,
        
        // Current Balance
        currentBalance: totalBalance,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Return user in PublicUser format
    return {
      id: authData.user.id,
      fullName,
      email: email.trim().toLowerCase(),
      profile,
      criteria,
      bankAnalysis,
      totalBalance,
      createdAt: authData.user.created_at,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already registered')) {
        throw new Error('An account with that email already exists.');
      }
      throw error;
    }
    throw new Error('Failed to create account');
  }
};

export const signInWithSupabase = async (email: string, password: string): Promise<PublicUser> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.message.includes('Invalid')) {
      throw new Error('Invalid email or password');
    }
    throw error;
  }

  if (!data.user) throw new Error('Failed to sign in');

  // Fetch user data from users table
  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (fetchError) throw fetchError;

  // Convert to PublicUser format (you'll need to map the database fields)
  return {
    id: data.user.id,
    fullName: `${userData.first_name} ${userData.last_name}`.trim(),
    email: data.user.email || '',
    profile: {
      jobTitle: '',
      jobType: '',
      monthlyIncome: 0,
      annualIncome: 0,
      hobbies: userData.hobbies || [],
      skills: [],
    },
    criteria: {
      bedrooms: userData.target_property_bedrooms || 0,
      bathrooms: userData.target_property_bathrooms || 0,
      location: userData.target_property_city || '',
      garage: userData.target_property_garage || false,
      propertyType: 'House',
      isFirstHomeBuyer: true,
      estimatedPrice: userData.estimated_property_price || 0,
      autoEstimate: false,
    },
    bankAnalysis: null,
    totalBalance: userData.current_balance || 0,
    createdAt: data.user.created_at,
  };
};

export const signOutFromSupabase = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentSupabaseUser = async (): Promise<PublicUser | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Fetch user data from users table
  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;

  return {
    id: user.id,
    fullName: `${userData.first_name} ${userData.last_name}`.trim(),
    email: user.email || '',
    profile: {
      jobTitle: '',
      jobType: '',
      monthlyIncome: 0,
      annualIncome: 0,
      hobbies: userData.hobbies || [],
      skills: [],
    },
    criteria: {
      bedrooms: userData.target_property_bedrooms || 0,
      bathrooms: userData.target_property_bathrooms || 0,
      location: userData.target_property_city || '',
      garage: userData.target_property_garage || false,
      propertyType: 'House',
      isFirstHomeBuyer: true,
      estimatedPrice: userData.estimated_property_price || 0,
      autoEstimate: false,
    },
    bankAnalysis: null,
    totalBalance: userData.current_balance || 0,
    createdAt: user.created_at,
  };
};