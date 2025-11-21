import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { HomeCriteria, UserProfile } from '../types';
import { generateSimulatorSummary } from '../services/geminiService';
import Button from '../components/Button';
import Icon from '../components/Icon';

const Slider: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min: number; max: number; step: number; unit?: string; }> = 
({ label, value, onChange, min, max, step, unit = '' }) => (
  <div>
    <label className="flex justify-between text-sm font-medium text-text-secondary mb-2">
      <span>{label}</span>
      <span className="font-bold text-text-primary">{unit === '$' && '$'}{value}{unit !== '$' && unit}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
    />
  </div>
);

const Simulator: React.FC<{ profile: UserProfile, criteria: HomeCriteria }> = ({ profile, criteria }) => {
  const [diningSpendReduction, setDiningSpendReduction] = useState(0);
  const [gigIncome, setGigIncome] = useState(0);
  const [cancelSubscriptions, setCancelSubscriptions] = useState(0);
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const initialMonthlySavings = useMemo(() => profile.monthlyIncome * 0.25, [profile.monthlyIncome]);
  const newMonthlySavings = useMemo(() => initialMonthlySavings + (initialMonthlySavings * (diningSpendReduction / 100)) + gigIncome + (cancelSubscriptions * 15), [initialMonthlySavings, diningSpendReduction, gigIncome, cancelSubscriptions]);
  const depositGoal = useMemo(() => criteria.estimatedPrice * (criteria.isFirstHomeBuyer ? 0.05 : 0.20), [criteria]);
  const originalETA = useMemo(() => initialMonthlySavings > 0 ? Math.ceil(depositGoal / initialMonthlySavings) : Infinity, [depositGoal, initialMonthlySavings]);
  const newETA = useMemo(() => newMonthlySavings > 0 ? Math.ceil(depositGoal / newMonthlySavings) : Infinity, [depositGoal, newMonthlySavings]);
  const timeSaved = useMemo(() => isFinite(originalETA) && isFinite(newETA) ? originalETA - newETA : 0, [originalETA, newETA]);
  
  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    const changesSummary = `Reducing dining by ${diningSpendReduction}%, adding $${gigIncome}/mo income, and canceling ${cancelSubscriptions} subscriptions.`;
    const result = await generateSimulatorSummary(changesSummary, `${originalETA} months`, `${newETA} months`);
    setSummary(result);
    setIsLoadingSummary(false);
  }

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-text-primary">What-If Simulator</h1>
        <p className="text-text-secondary mt-1 flex items-center justify-center">
          See how small changes can fast-track your goal!
          <Icon name="rocket" className="w-5 h-5 ml-2" />
        </p>
      </header>
      
       <Card className="text-center">
        <p className="text-sm text-text-secondary">New Time to Goal</p>
        <p className="text-5xl font-bold text-accent my-1">{isFinite(newETA) ? newETA : '∞'} <span className="text-3xl">months</span></p>
        {timeSaved > 0 && <p className="text-sm font-semibold text-green-600">🎉 You saved {timeSaved} months!</p>}
        <p className="text-xs text-gray-400 line-through mt-1">Originally {isFinite(originalETA) ? originalETA : '∞'} months</p>
      </Card>
        
      <Card>
        <h2 className="text-xl font-bold text-text-primary mb-6">Adjust Your Habits</h2>
        <div className="space-y-8">
          <Slider 
            label="Reduce Dining Out Spend" value={diningSpendReduction}
            onChange={(e) => setDiningSpendReduction(Number(e.target.value))}
            min={0} max={100} step={5} unit="%"
          />
          <Slider 
            label="Add Gig Income per Month" value={gigIncome}
            onChange={(e) => setGigIncome(Number(e.target.value))}
            min={0} max={1000} step={50} unit="$"
          />
          <Slider 
            label="Cancel Subscriptions" value={cancelSubscriptions}
            onChange={(e) => setCancelSubscriptions(Number(e.target.value))}
            min={0} max={5} step={1}
          />
        </div>
      </Card>

      <Card>
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center">AI Explanation <Icon name="sparkles" className="w-5 h-5 ml-2" /></h2>
            <Button onClick={handleGenerateSummary} isLoading={isLoadingSummary} disabled={diningSpendReduction === 0 && gigIncome === 0 && cancelSubscriptions === 0} className="w-full">
                Summarize Impact
            </Button>
            {summary && (
                <div className="mt-4 p-4 bg-background text-primary rounded-xl text-sm font-medium">
                    {summary}
                </div>
            )}
        </Card>
    </div>
  );
};

export default Simulator;
