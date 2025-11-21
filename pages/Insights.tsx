import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import Card from '../components/Card';
import Icon from '../components/Icon';
import { generateIncomeOpportunities, generateSpendingSuggestions } from '../services/geminiService';

const SuggestionCard: React.FC<{ title: string; description: string; value: string; icon: React.ComponentProps<typeof Icon>['name'];}> = ({ title, description, value, icon }) => (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-card-bg p-4 shadow-sm">
        <div className="text-2xl pt-1 text-primary">
          <Icon name={icon} className="w-6 h-6"/>
        </div>
        <div className="flex-grow">
            <p className="font-semibold text-text-primary">{title}</p>
            <p className="text-xs text-text-secondary">{description}</p>
        </div>
        <p className="ml-auto text-sm font-bold text-green-600 whitespace-nowrap pt-1">{value}</p>
    </div>
);

const Insights: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [incomeOpportunities, setIncomeOpportunities] = useState<any[]>([]);
  const [spendingSuggestions, setSpendingSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const incomePromise = profile.skills.length > 0 ? generateIncomeOpportunities(profile.skills) : Promise.resolve([]);
      const spendingPromise = generateSpendingSuggestions();
      
      const [income, spending] = await Promise.all([incomePromise, spendingPromise]);
      
      setIncomeOpportunities(income);
      setSpendingSuggestions(spending);
      setLoading(false);
    };

    fetchData();
  }, [profile.skills]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-primary">Actionable Insights</h1>
        <p className="text-text-secondary mt-1 flex items-center">
          AI-powered suggestions to help you reach your goal faster.
          <Icon name="sparkles" className="w-5 h-5 ml-2" />
        </p>
      </header>
      
      {loading ? (
        <Card className="text-center p-10">
          <svg className="animate-spin mx-auto h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-text-secondary">Generating your personalized insights...</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
              <h3 className="font-semibold text-text-primary mb-3 text-lg flex items-center">Earn Faster With Your Skills <Icon name="rocket" className="w-5 h-5 ml-2"/></h3>
              <div className="space-y-3">
              {incomeOpportunities.map((opp, i) => (
                  <SuggestionCard 
                      key={`income-${i}`} title={opp.title} description={opp.description}
                      value={`+$${opp.estimatedIncome}/mo`} icon="lightbulb"
                  />
              ))}
              </div>
          </Card>
          <Card>
              <h3 className="font-semibold text-text-primary mb-3 text-lg flex items-center">Improve Your Spending <Icon name="trending-down" className="w-5 h-5 ml-2"/></h3>
              <div className="space-y-3">
              {spendingSuggestions.map((sugg, i) => (
                  <SuggestionCard 
                      key={`spend-${i}`} title={sugg.title} description={sugg.description}
                      value={`-$${sugg.potentialSavings}/mo`} icon="cash"
                  />
              ))}
              </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Insights;
