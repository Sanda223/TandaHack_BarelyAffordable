import React, { useMemo } from 'react';
import { BankStatementAnalysis, Page, UserProfile } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface FinancialReportProps {
  bankAnalysis: BankStatementAnalysis | null;
  profile: UserProfile;
  setActivePage: (page: Page) => void;
}

const colorPalette = ['#00C0A3', '#5EEAD4', '#FBBF24', '#FB7185', '#818CF8'];

const FinancialReport: React.FC<FinancialReportProps> = ({ bankAnalysis, profile, setActivePage }) => {
  const recurringExpenses = bankAnalysis?.recurringExpenses ?? [];
  const recurringAmount = (item: (typeof recurringExpenses)[number]) =>
    Math.round(item.estimatedMonthlyCost ?? item.averageAmount ?? (item as any).amount ?? 0);

  const totalRecurring = useMemo(() => {
    if (!bankAnalysis) return 0;
    return recurringExpenses.reduce((sum, item) => sum + recurringAmount(item), 0);
  }, [bankAnalysis, recurringExpenses]);

  // Prefer grouped categories from analyzer JSON; fall back to recurring + discretionary
  const chartData = useMemo(() => {
    if (!bankAnalysis) return [];
    const categories = (bankAnalysis.expenseByCategory ?? []).filter(
      (cat) => cat.category !== 'Unknown' && cat.totalSpend > 0,
    );
    if (categories.length > 0) {
      return categories
        .map((cat) => ({
          name: cat.category,
          amount:
            cat.averageMonthlySpend && cat.averageMonthlySpend > 0
              ? Math.round(cat.averageMonthlySpend)
              : Math.round(cat.totalSpend / Math.max(cat.monthCount || 1, 1)),
        }))
        .sort((a, b) => b.amount - a.amount);
    }

    // Fallback to recurring + discretionary
    const items = recurringExpenses.map((item) => ({
      name: item.name,
      amount: recurringAmount(item),
    }));
    const discretionary = Math.max(bankAnalysis.monthlyAverageSpend - totalRecurring, 0);
    if (discretionary > 0) {
      items.push({ name: 'Discretionary', amount: discretionary });
    }
    return items.sort((a, b) => b.amount - a.amount);
  }, [bankAnalysis, recurringExpenses, totalRecurring]);

  const savingsRate = useMemo(() => {
    if (!bankAnalysis) return 0;
    const total = bankAnalysis.monthlyAverageSpend + bankAnalysis.monthlyAverageSavings;
    return total > 0 ? Math.round((bankAnalysis.monthlyAverageSavings / total) * 100) : 0;
  }, [bankAnalysis]);

  const burnRate = useMemo(() => {
    if (!bankAnalysis) return 0;
    return bankAnalysis.monthlyAverageSpend - bankAnalysis.monthlyAverageSavings;
  }, [bankAnalysis]);

  const leakageHotspots = useMemo(() => {
    if (bankAnalysis?.leakageHotspots?.length) {
      return bankAnalysis.leakageHotspots.map((item, index) => {
        const amount = Math.round(
          item.estimatedMonthlyCost ?? item.averageAmount ?? (item as any).amount ?? 0,
        );
        return {
          name: item.name,
          amount,
          impact: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Moderate',
          suggestion: `Cut ${item.name} by 15% to free up ~$${Math.round(amount * 0.15)} each month.`,
        };
      });
    }

    if (!chartData.length) return [];
    return chartData.slice(0, 3).map((item, index) => ({
      ...item,
      impact: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Moderate',
      suggestion: `Cut ${item.name} by 15% to free up ~$${(item.amount * 0.15).toFixed(0)} each month.`,
    }));
  }, [bankAnalysis?.leakageHotspots, chartData]);

  if (!bankAnalysis) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-text-primary">Financial Report</h1>
          <p className="text-text-secondary mt-1">
            Upload your bank statements to see a breakdown of spending, leakage, and opportunities.
          </p>
        </header>
        <Card className="text-center space-y-4">
          <Icon name="document-text" className="w-12 h-12 mx-auto text-text-secondary" />
          <p className="text-text-primary font-semibold">No statement analyzed yet</p>
          <p className="text-sm text-text-secondary">
            Head to your profile to upload a 3-month bank statement and unlock tailored insights.
          </p>
          <Button onClick={() => setActivePage(Page.Profile)} variant="secondary" className="w-full">
            Go to Profile
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-primary">Financial Report</h1>
        <p className="text-text-secondary mt-1">
          Hi {profile.jobTitle ? profile.jobTitle.split(' ')[0] : 'there'}, here’s how last month’s cash flow performed.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Avg Monthly Spend</p>
          <p className="text-2xl font-bold text-text-primary mt-1">${Math.round(bankAnalysis.monthlyAverageSpend).toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Avg Monthly Savings</p>
          <p className="text-2xl font-bold text-primary mt-1">${Math.round(bankAnalysis.monthlyAverageSavings).toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Savings Rate</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{savingsRate}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Burn Rate</p>
          <p className="text-2xl font-bold text-red-500 mt-1">${burnRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Where your money goes</h2>
          <span className="text-sm text-text-secondary">Recurring + discretionary</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.08)" />
              <XAxis type="number" unit="$" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                cursor={{ fill: 'rgba(0, 192, 163, 0.08)' }}
              />
              <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={22}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colorPalette[index % colorPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Leakage hotspots</h2>
          <span className="text-sm text-text-secondary">Focus on these first</span>
        </div>
        <div className="space-y-4">
          {leakageHotspots.map((item) => (
            <div key={item.name} className="flex items-start gap-4 rounded-2xl border border-gray-100 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                {item.impact}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text-primary">{item.name}</p>
                <p className="text-sm text-text-secondary">Monthly spend: ${item.amount.toFixed(2)}</p>
                <p className="text-sm text-text-primary mt-1">{item.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Action plan</h2>
          <span className="text-sm text-text-secondary">Stay accountable</span>
        </div>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <Icon name="check" className="w-5 h-5 text-primary mt-1" />
            <p className="text-sm text-text-primary">
              Automate transfers: move ${Math.round(bankAnalysis.monthlyAverageSavings * 0.5)} to a high-yield savings account on payday.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <Icon name="trending-down" className="w-5 h-5 text-primary mt-1" />
            <p className="text-sm text-text-primary">
              Set spending caps for top 2 categories to keep burn rate under ${Math.max(0, burnRate - 200).toLocaleString()}.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <Icon name="lightbulb" className="w-5 h-5 text-primary mt-1" />
            <p className="text-sm text-text-primary">
              Revisit this report weekly after uploading new statements to track improvements.
            </p>
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default FinancialReport;
