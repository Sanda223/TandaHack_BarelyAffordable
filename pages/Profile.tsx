import React, { useState, useCallback } from 'react';
import { UserProfile, BankStatementAnalysis, HomeCriteria, Page } from '../types';
import Card from '../components/Card';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { suggestSkills } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProfileProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  bankAnalysis: BankStatementAnalysis | null;
  setBankAnalysis: React.Dispatch<React.SetStateAction<BankStatementAnalysis | null>>;
  criteria: HomeCriteria;
  setCriteria: React.Dispatch<React.SetStateAction<HomeCriteria>>;
  setActivePage: (page: Page) => void;
}

const inputClasses = "w-full p-3 bg-white border rounded-xl border-gray-300 shadow-sm text-sm focus:border-primary focus:ring-1 focus:ring-primary";

const InputField: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        {children}
    </div>
);

const Section: React.FC<{title: string; icon: React.ComponentProps<typeof Icon>['name']; children: React.ReactNode}> = ({title, icon, children}) => (
    <Card>
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
          <Icon name={icon} className="w-6 h-6 mr-3 text-primary" /> 
          {title}
        </h2>
        <div className="space-y-6">
            {children}
        </div>
    </Card>
);

const Profile: React.FC<ProfileProps> = ({ profile, setProfile, bankAnalysis, setBankAnalysis, criteria, setCriteria, setActivePage }) => {
  const [newHobby, setNewHobby] = useState('');
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'annualIncome') {
        const annual = parseFloat(value) || 0;
        setProfile({ 
            ...profile, 
            annualIncome: annual,
            monthlyIncome: parseFloat((annual / 12).toFixed(2)) 
        });
    } else if (name === 'monthlyIncome') {
        const monthly = parseFloat(value) || 0;
        setProfile({ 
            ...profile, 
            monthlyIncome: monthly,
            annualIncome: parseFloat((monthly * 12).toFixed(2))
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
    setProfile({ ...profile, hobbies: profile.hobbies.filter(hobby => hobby !== hobbyToRemove) });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Simulate analysis
      setTimeout(() => {
        setBankAnalysis({
          monthlyAverageSpend: 2850.75,
          monthlyAverageSavings: 1149.25,
          recurringExpenses: [
            { name: 'Netflix', amount: 15.99 },
            { name: 'Gym', amount: 40.00 },
            { name: 'Utilities', amount: 120.00 },
            { name: 'Rent', amount: 1500.00 },
          ],
        });
      }, 1500);
    }
  };
  
  const handleGetSkillSuggestions = useCallback(async () => {
    if (!profile.jobTitle || profile.hobbies.length === 0) return;
    setIsLoadingSkills(true);
    const skills = await suggestSkills(profile.jobTitle, profile.hobbies);
    setProfile(prev => ({...prev, skills: [...new Set([...prev.skills, ...skills])]}));
    setIsLoadingSkills(false);
  }, [profile.jobTitle, profile.hobbies, setProfile]);

  const depositGoal = criteria.estimatedPrice * (criteria.isFirstHomeBuyer ? 0.05 : 0.20);

  const spendChartData = bankAnalysis ? [
    ...bankAnalysis.recurringExpenses,
    {
      name: 'Other',
      amount: bankAnalysis.monthlyAverageSpend - bankAnalysis.recurringExpenses.reduce((sum, item) => sum + item.amount, 0),
    },
  ].sort((a, b) => a.amount - b.amount) : [];


  return (
    <div className="space-y-6">
      <div className="px-1 pt-2">
        <div className="flex items-center justify-between rounded-2xl px-2 py-1.5">
          <div className="text-lg font-bold text-primary tracking-tight">Days-to</div>
          <button
            onClick={() => setActivePage(Page.Dashboard)}
            className="flex items-center gap-1 rounded-full border border-gray-200 bg-card-bg px-3 py-1.5 text-sm font-semibold text-text-primary shadow-subtle transition hover:border-primary/60 hover:text-primary"
          >
            <Icon name="arrow-right" className="w-4 h-4 rotate-180" />
            Back
          </button>
        </div>
      </div>
      <header>
        <h1 className="text-3xl font-bold text-text-primary">Your Profile</h1>
        <p className="text-text-secondary mt-1 flex items-center">
          Let's personalize your path to homeownership.
          <Icon name="home" className="w-5 h-5 ml-2" />
        </p>
      </header>

      <Section title="About You" icon="user">
          <InputField label="Job Title">
            <input type="text" name="jobTitle" value={profile.jobTitle} onChange={handleProfileChange} className={inputClasses} />
          </InputField>
          <InputField label="Annual Income ($)">
            <input type="number" name="annualIncome" value={profile.annualIncome || ''} onChange={handleProfileChange} className={inputClasses} placeholder="e.g., 60000"/>
          </InputField>
          <InputField label="Monthly Income ($)">
             <input type="number" name="monthlyIncome" value={profile.monthlyIncome || ''} onChange={handleProfileChange} className={`${inputClasses} bg-light-gray`} readOnly/>
          </InputField>
          <InputField label="Hobbies (for earning opportunities!)">
            <div className="flex items-center gap-2">
              <input type="text" value={newHobby} onChange={(e) => setNewHobby(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddHobby()} placeholder="e.g., Painting" className={inputClasses} />
              <Button onClick={handleAddHobby} variant="secondary">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.hobbies.map(hobby => (
                <span key={hobby} className="bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full flex items-center">
                  {hobby} <button onClick={() => handleRemoveHobby(hobby)} className="ml-1.5 font-bold text-primary/70 hover:text-primary">&times;</button>
                </span>
              ))}
            </div>
          </InputField>
          <InputField label="Your Skills">
              <Button onClick={handleGetSkillSuggestions} isLoading={isLoadingSkills} disabled={!profile.jobTitle || profile.hobbies.length === 0}>
                Suggest Skills with AI <Icon name="sparkles" className="w-4 h-4 ml-2" />
              </Button>
               <div className="flex flex-wrap gap-2 mt-3">
                {profile.skills.map(skill => (
                  <span key={skill} className="bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-full">{skill}</span>
                ))}
              </div>
          </InputField>
      </Section>

      <Section title="Financial Snapshot" icon="chart-bar">
        {!bankAnalysis ? (
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                <Icon name="upload" className="mx-auto h-12 w-12 text-text-secondary" />
                <h3 className="mt-2 font-semibold text-text-primary">Upload Bank Statement</h3>
                <p className="mt-1 text-sm text-text-secondary">Upload a 3-month statement (CSV/PDF) for analysis.</p>
                <div className="mt-4">
                  <input type="file" id="file-upload" className="sr-only" onChange={handleFileChange} accept=".csv,.pdf" />
                  <label htmlFor="file-upload" className="inline-block rounded-xl px-5 py-3 text-sm font-medium transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-white hover:shadow-lg hover:shadow-primary/30 focus:ring-primary cursor-pointer">Select File</label>
                </div>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-light-gray rounded-xl">
                    <span className="font-medium text-text-secondary">Avg. Monthly Savings</span>
                    <span className="font-bold text-lg text-green-600">${bankAnalysis.monthlyAverageSavings.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-center p-4 bg-light-gray rounded-xl">
                    <span className="font-medium text-text-secondary">Avg. Monthly Spend</span>
                    <span className="font-bold text-lg text-red-500">${bankAnalysis.monthlyAverageSpend.toFixed(2)}</span>
                </div>
                
                <div className="pt-4">
                    <h4 className="font-semibold text-text-primary mb-2 text-center">Spending Breakdown</h4>
                     <div className="h-64 mt-2">
                      {bankAnalysis.recurringExpenses.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={spendChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.1)"/>
                                <XAxis type="number" unit="$" tick={{fontSize: 12}} />
                                <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 12}} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(0, 192, 163, 0.1)'}} 
                                    formatter={(value: number) => `$${value.toFixed(2)}`} 
                                    contentStyle={{
                                        borderRadius: '0.75rem',
                                        borderColor: '#e2e8f0',
                                        fontSize: '0.875rem'
                                    }}
                                />
                                <Bar dataKey="amount" fill="#00C0A3" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full bg-light-gray rounded-xl">
                          <p className="text-text-secondary italic">Error: No recurring expenses found to display.</p>
                        </div>
                      )}
                    </div>
                </div>

            </div>
        )}
      </Section>
      
      <Section title="Dream Home Criteria" icon="target">
            <InputField label="Location (City/Suburb)">
                <input type="text" name="location" value={criteria.location} onChange={handleCriteriaChange} className={inputClasses} placeholder="e.g., Sunnyvale"/>
            </InputField>
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Bedrooms">
                    <input type="number" name="bedrooms" value={criteria.bedrooms} onChange={handleCriteriaChange} className={inputClasses}/>
                </InputField>
                <InputField label="Bathrooms">
                    <input type="number" name="bathrooms" value={criteria.bathrooms} onChange={handleCriteriaChange} className={inputClasses}/>
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

    </div>
  );
};

export default Profile;
