import React, { useState, useEffect, useMemo } from 'react';
import { HomeCriteria, Page, UserProfile } from '../types';
import Card from '../components/Card';
import { generateIncomeOpportunities, generateSpendingSuggestions, analyzePriceFromImage } from '../services/geminiService';
import Icon from '../components/Icon';
import Button from '../components/Button';

const KPICard: React.FC<{ title: string; value: string; icon: React.ComponentProps<typeof Icon>['name']; }> = ({ title, value, icon }) => (
  <Card className="flex-1 text-center">
    <div className="text-3xl mb-1 text-primary flex items-center justify-center">
      <Icon name={icon} className="w-8 h-8"/>
    </div>
    <p className="text-sm text-text-secondary font-medium">{title}</p>
    <p className="text-xl font-bold text-text-primary mt-1">{value}</p>
  </Card>
);

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

const Dashboard: React.FC<{ profile: UserProfile, criteria: HomeCriteria, setActivePage: (page: Page) => void, interestRate: number, loanTerm: number }> = ({ profile, criteria, setActivePage, interestRate, loanTerm }) => {
  const [currentSavings] = useState(15750);
  const [incomeOpportunities, setIncomeOpportunities] = useState<any[]>([]);
  const [spendingSuggestions, setSpendingSuggestions] = useState<any[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedPrice, setAnalyzedPrice] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  useEffect(() => {
    if (profile.skills.length > 0) {
      generateIncomeOpportunities(profile.skills).then(setIncomeOpportunities);
    }
    generateSpendingSuggestions().then(setSpendingSuggestions);
  }, [profile.skills]);

  const depositGoal = useMemo(() => criteria.estimatedPrice * (criteria.isFirstHomeBuyer ? 0.05 : 0.20), [criteria.estimatedPrice, criteria.isFirstHomeBuyer]);
  
  const monthlySavings = useMemo(() => profile.monthlyIncome * 0.25, [profile.monthlyIncome]); // Simple assumption
  const dailySavings = useMemo(() => monthlySavings / (365.25 / 12), [monthlySavings]);

  const daysToGoal = useMemo(() => {
    const savingsNeeded = depositGoal - currentSavings;
    if (savingsNeeded <= 0) return 0;
    
    if (dailySavings <= 0) return '∞';

    return Math.ceil(savingsNeeded / dailySavings);
  }, [currentSavings, depositGoal, dailySavings]);

  const loanAmount = useMemo(() => Math.max(0, criteria.estimatedPrice - currentSavings), [criteria.estimatedPrice, currentSavings]);

  const monthlyPayment = useMemo(() => {
    if (loanAmount <= 0) return 0;
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    if (monthlyInterestRate === 0) {
      return loanAmount / numberOfPayments;
    }

    const payment =
      loanAmount *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    return payment;
  }, [loanAmount, interestRate, loanTerm]);
  
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // remove data:mime/type;base64, part
        };
        reader.onerror = (error) => reject(error);
    });

  const handleImageUpload = async (file: File) => {
    setIsAnalyzing(true);
    setAnalyzedPrice(null);
    setAnalysisResult(null);

    try {
        const base64Image = await fileToBase64(file);
        const price = await analyzePriceFromImage(base64Image, file.type);
        
        setAnalyzedPrice(price);

        if (price > 0 && dailySavings > 0) {
            const daysAdded = Math.ceil(price / dailySavings);
            if (daysAdded === 1) {
                setAnalysisResult('1 day');
            } else {
                setAnalysisResult(`${daysAdded} days`);
            }
        } else if (price > 0) {
            setAnalysisResult('a long time');
        }
        else {
            setAnalysisResult("Couldn't find a price.");
        }
    } catch (error) {
        console.error("Image analysis failed:", error);
        setAnalysisResult("Analysis failed.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-primary flex items-center">Hey there! <Icon name="hand-wave" className="w-8 h-8 ml-2"/></h1>
        <p className="text-text-secondary">Here's your progress on the path to your new home.</p>
      </header>
      
      <Card className="text-center relative">
        <button 
          onClick={() => setActivePage(Page.Settings)} 
          className="absolute top-4 right-4 text-text-secondary hover:text-primary transition-colors p-2"
          aria-label="Open settings"
        >
            <Icon name="settings" className="w-6 h-6" />
        </button>
        <p className="text-lg text-text-secondary font-medium">Your Dream Home is</p>
        <p className="text-7xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent my-2 tracking-tight">{daysToGoal}</p>
        <p className="text-lg text-text-secondary font-medium -mt-2">days away!</p>
        <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center text-left">
            <div>
                <p className="text-sm text-text-secondary">Current Savings</p>
                <p className="font-bold text-xl text-text-primary">${currentSavings.toLocaleString()}</p>
            </div>
            <div className="text-right">
                <p className="text-sm text-text-secondary">Deposit Goal</p>
                <p className="font-bold text-xl text-text-primary">${depositGoal.toLocaleString()}</p>
            </div>
        </div>
      </Card>
      
      <Card>
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              Expense Impact Analyzer <Icon name="camera" className="w-5 h-5 ml-2" />
          </h2>
          <p className="text-sm text-text-secondary mb-4">
              Thinking about a purchase? Snap a photo of its price tag to see how it could delay your homeownership goal.
          </p>
          <input
              type="file"
              accept="image/*"
              capture="environment"
              id="expense-analyzer-input"
              className="hidden"
              onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0]);
                  }
                  if (e.target) {
                      e.target.value = '';
                  }
              }}
          />
          <Button 
              onClick={() => document.getElementById('expense-analyzer-input')?.click()}
              variant="secondary"
              className="w-full"
              isLoading={isAnalyzing}
          >
              <Icon name="camera" className="w-5 h-5 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Analyze Purchase"}
          </Button>

          {analysisResult && (
              <div className="mt-4 p-4 bg-background rounded-xl text-center transition-all duration-300">
                  {analyzedPrice !== null && analyzedPrice > 0 ? (
                      <>
                          <p className="text-sm text-text-secondary">
                              This <span className="font-bold text-text-primary">${analyzedPrice.toFixed(2)}</span> purchase would set you back by:
                          </p>
                          <p className="text-2xl font-bold text-primary mt-1">{analysisResult}</p>
                      </>
                  ) : (
                      <p className="text-sm font-medium text-text-primary">{analysisResult}</p>
                  )}
              </div>
          )}
      </Card>
      
       <Card>
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">
            AI-Powered Suggestions <Icon name="sparkles" className="w-5 h-5 ml-2" />
        </h2>
        <div className="space-y-3">
             {incomeOpportunities.slice(0, 2).map((opp, i) => (
                <SuggestionCard 
                    key={`income-${i}`} title={opp.title} description={opp.description}
                    value={`+$${opp.estimatedIncome}/mo`} icon="lightbulb"
                />
            ))}
            {spendingSuggestions.slice(0, 2).map((sugg, i) => (
                <SuggestionCard 
                    key={`spend-${i}`} title={sugg.title} description={sugg.description}
                    value={`-$${sugg.potentialSavings}/mo`} icon="cash"
                />
            ))}
        </div>
        <Button onClick={() => setActivePage(Page.Insights)} variant="secondary" className="w-full mt-4">
            See All Insights
        </Button>
      </Card>
    </div>
  );
};

export default Dashboard;
