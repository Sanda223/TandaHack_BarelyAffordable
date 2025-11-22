import React, { useState, useCallback, useEffect } from 'react';
import { UserProfile, BankStatementAnalysis, HomeCriteria, Page } from '../types';
import Card from '../components/Card';
import Icon from '../components/Icon';
import Button from '../components/Button';
import logo from '../assets/logo.png';
import { suggestSkillsAndJobsFromHobbies, shortenExpenseNames } from '../services/geminiService';
import { updateSupabaseUser } from '../services/supabaseAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProfileProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  bankAnalysis: BankStatementAnalysis | null;
  setBankAnalysis: React.Dispatch<React.SetStateAction<BankStatementAnalysis | null>>;
  criteria: HomeCriteria;
  setCriteria: React.Dispatch<React.SetStateAction<HomeCriteria>>;
  setActivePage: (page: Page) => void;
  onSignOut?: () => void;
  fullName?: string;
  userId: string | null;
  totalBalance: number;
}

const inputClasses = 'w-full p-3 bg-white border rounded-xl border-gray-300 shadow-sm text-sm focus:border-primary focus:ring-1 focus:ring-primary';

const InputField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
    {children}
  </div>
);

const Section: React.FC<{ title: string; icon: React.ComponentProps<typeof Icon>['name']; children: React.ReactNode }> = ({ title, icon, children }) => (
  <Card>
    <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
      <Icon name={icon} className="w-6 h-6 mr-3 text-primary" />
      {title}
    </h2>
    <div className="space-y-6">{children}</div>
  </Card>
);

const Profile: React.FC<ProfileProps> = ({ profile, setProfile, bankAnalysis, setBankAnalysis, criteria, setCriteria, setActivePage, onSignOut, fullName, userId, totalBalance }) => {
  const [newHobby, setNewHobby] = useState('');
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [shortExpenseNames, setShortExpenseNames] = useState<Record<string, string>>({});
  const [suggestedJobs, setSuggestedJobs] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'annualIncome') {
      const annual = parseFloat(value) || 0;
      setProfile({
        ...profile,
        annualIncome: annual,
        monthlyIncome: parseFloat((annual / 12).toFixed(2)),
      });
    } else if (name === 'monthlyIncome') {
      const monthly = parseFloat(value) || 0;
      setProfile({
        ...profile,
        monthlyIncome: monthly,
        annualIncome: parseFloat((monthly * 12).toFixed(2)),
      });
    } else {
      setProfile({ ...profile, [name]: value });
    }
  };

  const handleCriteriaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setCriteria({ ...criteria, [name]: checked });
    } else {
      const isNumericField = name === 'bedrooms' || name === 'bathrooms';
      setCriteria({ ...criteria, [name]: isNumericField ? parseInt(value, 10) || 0 : value });
    }
  };

  const handleAddHobby = () => {
    const trimmedHobby = newHobby.trim();
    if (trimmedHobby && !profile.hobbies.includes(trimmedHobby)) {
      setProfile({ ...profile, hobbies: [...profile.hobbies, trimmedHobby] });
      setNewHobby('');
    }
  };

  const handleRemoveHobby = (hobbyToRemove: string) => {
    setProfile({ ...profile, hobbies: profile.hobbies.filter((hobby) => hobby !== hobbyToRemove) });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTimeout(() => {
        setBankAnalysis({
          monthlyAverageSpend: Math.round(2850.75),
          monthlyAverageSavings: Math.round(1149.25),
          recurringExpenses: [
            { name: 'Netflix', averageAmount: Math.round(15.99), category: 'Subscriptions', macroCategory: 'Lifestyle', transactionCount: 3, monthCount: 3, estimatedMonthlyCost: Math.round(15.99) },
            { name: 'Gym', averageAmount: Math.round(40.0), category: 'Utilities', macroCategory: 'Essential', transactionCount: 3, monthCount: 3, estimatedMonthlyCost: Math.round(40.0) },
            { name: 'Utilities', averageAmount: Math.round(120.0), category: 'Utilities', macroCategory: 'Essential', transactionCount: 3, monthCount: 3, estimatedMonthlyCost: Math.round(120.0) },
            { name: 'Rent', averageAmount: Math.round(1500.0), category: 'Rent', macroCategory: 'Essential', transactionCount: 3, monthCount: 3, estimatedMonthlyCost: Math.round(1500.0) },
          ],
          monthlyBreakdown: [],
          incomeSources: [],
          totalTransactions: 0,
          totalInflowTransactions: 0,
          totalOutflowTransactions: 0,
          totalAverageMonthlyIncome: 0,
          expenseByMacro: [],
          expenseByCategory: [],
          recurringEssential: [],
          recurringLifestyle: [],
          leakageHotspots: [],
          monthsCovered: [],
          startDate: '',
          endDate: '',
        });
      }, 1500);
    }
  };

  const handleGetSkillSuggestions = useCallback(async () => {
    if (profile.hobbies.length === 0) return;
    setIsLoadingSkills(true);
    const { skills, jobs } = await suggestSkillsAndJobsFromHobbies(profile.hobbies);
    setProfile((prev) => ({ ...prev, skills: [...new Set([...prev.skills, ...skills])] }));
    setSuggestedJobs(jobs);
    setIsLoadingSkills(false);
  }, [profile.hobbies, setProfile]);

  const handleUpdateProfile = async () => {
    if (!userId) {
      setUpdateMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      await updateSupabaseUser({
        userId,
        profile,
        criteria,
        bankAnalysis,
        totalBalance,
      });
      setUpdateMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (error) {
      console.error('Update error:', error);
      setUpdateMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const depositGoal = criteria.estimatedPrice * (criteria.isFirstHomeBuyer ? 0.05 : 0.2);

  const recurringExpenses = bankAnalysis?.recurringExpenses ?? [];

  const categoryChartData = bankAnalysis?.expenseByCategory
    ?.filter((cat) => cat.category !== 'Unknown')
    .map((cat) => {
      const monthly =
        cat.averageMonthlySpend && cat.averageMonthlySpend > 0
          ? cat.averageMonthlySpend
          : cat.totalSpend / Math.max(cat.monthCount || 1, 1);
      return {
        name: cat.category,
        amount: Math.max(0, Math.round(monthly)),
      };
    }) ?? [];

  const spendChartData = bankAnalysis
    ? categoryChartData.length > 0
      ? categoryChartData.sort((a, b) => a.amount - b.amount)
      : recurringExpenses
          .map((expense) => ({
            name: shortExpenseNames[expense.name] ?? expense.name,
            amount: expense.estimatedMonthlyCost ?? expense.averageAmount ?? (expense as any).amount ?? 0,
          }))
          .sort((a, b) => a.amount - b.amount)
    : [];

  useEffect(() => {
    if (!bankAnalysis) return;
    const names = bankAnalysis.recurringExpenses.map((e) => e.name);
    if (names.length === 0) return;
    let cancelled = false;
    (async () => {
      const shortened = await shortenExpenseNames(names);
      if (!cancelled) {
        setShortExpenseNames(shortened);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bankAnalysis ? bankAnalysis.recurringExpenses.map((e) => e.name).join('|') : '']);

  const firstName = fullName?.trim().split(' ')[0] || '';
  const possessiveName = firstName ? (firstName.endsWith('s') || firstName.endsWith('S') ? `${firstName}'` : `${firstName}'s`) : '';

  return (
    <div className="space-y-4">
      <div className="fixed inset-x-0 top-0 z-20 bg-background/90 backdrop-blur px-4 md:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2 pl-2 -mt-8 -mb-9">
            <img src={logo} alt="Logo" className="h-36 w-36 object-contain -mb-2" />
          </div>
          <div className="pr-2">
            <button
              onClick={() => setActivePage(Page.Dashboard)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-card-bg text-text-primary shadow-subtle transition hover:border-primary/60 hover:text-primary"
              aria-label="Go back"
            >
              <Icon name="arrow-right" className="h-5 w-5 rotate-180" />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-[4rem] space-y-6">
        <div aria-hidden className="h-10" />
        <header>
          <h1 className="text-3xl font-bold  text-text-primary">{possessiveName ? `${possessiveName} Profile` : 'Your Profile'}</h1>
          <p className="text-text-secondary mt-1">
            Let's personalize your path to homeownership.
          </p>
        </header>

        <Section title="About You" icon="user">
          <InputField label="Job Title">
            <input type="text" name="jobTitle" value={profile.jobTitle} onChange={handleProfileChange} className={inputClasses} />
          </InputField>
          <InputField label="Annual Income ($)">
            <input type="number" name="annualIncome" value={profile.annualIncome || ''} onChange={handleProfileChange} className={inputClasses} placeholder="e.g., 60000" />
          </InputField>
          <InputField label="Monthly Income ($)">
            <input type="number" name="monthlyIncome" value={profile.monthlyIncome || ''} onChange={handleProfileChange} className={`${inputClasses} bg-light-gray`} readOnly />
          </InputField>
          <InputField label="Hobbies (for earning opportunities!)">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newHobby}
                onChange={(e) => setNewHobby(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddHobby()}
                placeholder="e.g., Painting"
                className={inputClasses}
              />
              <Button onClick={handleAddHobby} variant="secondary">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.hobbies.map((hobby) => (
                <span key={hobby} className="bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full flex items-center">
                  {hobby}
                  <button onClick={() => handleRemoveHobby(hobby)} className="ml-1.5 font-bold text-primary/70 hover:text-primary">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </InputField>
          <InputField label="Your Skills">
            <Button onClick={handleGetSkillSuggestions} isLoading={isLoadingSkills} disabled={profile.hobbies.length === 0}>
              Suggest Skills and Career Paths with AI <Icon name="sparkles" className="w-4 h-4 ml-2" />
            </Button>
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.skills.map((skill) => (
                <span key={skill} className="bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </InputField>
          {suggestedJobs.length > 0 && (
            <InputField label="Suggested Career Paths">
              <div className="flex flex-wrap gap-2">
                {suggestedJobs.map((job) => (
                  <span key={job} className="bg-accent/10 text-accent text-sm font-medium px-3 py-1.5 rounded-full">
                    {job}
                  </span>
                ))}
              </div>
            </InputField>
          )}
        </Section>

        <Section title="Financial Snapshot" icon="chart-bar">
          {!bankAnalysis ? (
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
              <Icon name="upload" className="mx-auto h-12 w-12 text-text-secondary" />
              <h3 className="mt-2 font-semibold text-text-primary">Upload Bank Statement</h3>
              <p className="mt-1 text-sm text-text-secondary">Upload a 3-month statement (CSV/PDF) for analysis.</p>
              <div className="mt-4">
                <input type="file" id="file-upload" className="sr-only" onChange={handleFileChange} accept=".csv,.pdf" />
                <label
                  htmlFor="file-upload"
                  className="inline-block rounded-xl px-5 py-3 text-sm font-medium transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-white hover:shadow-lg hover:shadow-primary/30 focus:ring-primary cursor-pointer"
                >
                  Select File
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-light-gray rounded-xl">
                <span className="font-medium text-text-secondary">Avg. Monthly Savings</span>
                <span className="font-bold text-lg text-green-600">${Math.round(bankAnalysis.monthlyAverageSavings).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-light-gray rounded-xl">
                <span className="font-medium text-text-secondary">Avg. Monthly Spend</span>
                <span className="font-bold text-lg text-red-500">${Math.round(bankAnalysis.monthlyAverageSpend).toLocaleString()}</span>
              </div>

              <div className="pt-4">
                <h4 className="font-semibold text-text-primary mb-2 text-center">Spending Breakdown</h4>
                <div className="h-64 mt-2">
                  {spendChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.1)" />
                        <XAxis type="number" unit="$" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} />
                        <Tooltip
                          cursor={{ fill: 'rgba(0, 192, 163, 0.1)' }}
                          formatter={(value: number) => `$${value.toFixed(2)}`}
                          contentStyle={{
                            borderRadius: '0.75rem',
                            borderColor: '#e2e8f0',
                            fontSize: '0.875rem',
                          }}
                        />
                        <Bar dataKey="amount" fill="#00C0A3" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-light-gray rounded-xl">
                      <p className="text-text-secondary italic">No spending categories found to display.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Dream Home Criteria" icon="target">
          <InputField label="Location (City/Suburb)">
            <input type="text" name="location" value={criteria.location} onChange={handleCriteriaChange} className={inputClasses} placeholder="e.g., Sunnyvale" />
          </InputField>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Bedrooms">
              <input type="number" name="bedrooms" value={criteria.bedrooms} onChange={handleCriteriaChange} className={inputClasses} />
            </InputField>
            <InputField label="Bathrooms">
              <input type="number" name="bathrooms" value={criteria.bathrooms} onChange={handleCriteriaChange} className={inputClasses} />
            </InputField>
          </div>
          <div className="mt-6 p-6 rounded-2xl bg-primary text-white text-center">
            <p className="font-medium opacity-80">Your Deposit Goal</p>
            <p className="text-4xl font-bold mt-1">${depositGoal.toLocaleString()}</p>
            <p className="text-xs opacity-70 mt-1">Based on an estimated price of ${criteria.estimatedPrice.toLocaleString()}</p>
          </div>
        </Section>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-text-primary">Financial Settings</h3>
              <p className="text-sm text-text-secondary">Adjust loan assumptions and buyer status.</p>
            </div>
            <Button onClick={() => setActivePage(Page.Settings)} variant="secondary" className="!p-3">
              <Icon name="settings" className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        {updateMessage && (
          <Card className={`${updateMessage.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-center font-medium ${updateMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {updateMessage.text}
            </p>
          </Card>
        )}

        <div className="pt-4 space-y-3">
          <Button onClick={handleUpdateProfile} isLoading={isUpdating} className="w-full justify-center">
            <Icon name="check" className="w-4 h-4 mr-2" />
            Update Profile
          </Button>
          {onSignOut && (
            <Button onClick={onSignOut} variant="secondary" className="w-full justify-center">
              <Icon name="arrow-right" className="w-4 h-4 rotate-180" />
              Sign out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
