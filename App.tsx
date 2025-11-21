import React, { useState, useEffect } from 'react';
import { Page, UserProfile, BankStatementAnalysis, HomeCriteria } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Learning from './pages/Learning';
import Simulator from './pages/Simulator';
import Settings from './pages/Settings';
import Insights from './pages/Insights';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import FinancialReport from './pages/FinancialReport';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.SignIn);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    jobTitle: 'Software Engineer',
    jobType: 'Salary',
    annualIncome: 90000,
    monthlyIncome: 7500,
    hobbies: ['Coding', 'Hiking', 'Photography'],
    skills: ['React', 'TypeScript', 'Node.js'],
  });

  const [bankAnalysis, setBankAnalysis] = useState<BankStatementAnalysis | null>(null);

  const [criteria, setCriteria] = useState<HomeCriteria>({
    bedrooms: 3,
    bathrooms: 2,
    location: 'Austin, TX',
    garage: true,
    propertyType: 'House',
    isFirstHomeBuyer: true,
    estimatedPrice: 550000,
    autoEstimate: false,
  });

  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);

  useEffect(() => {
    if (!criteria.autoEstimate) return;
    
    const basePrice = 400000;
    const price = basePrice + 
                  (criteria.bedrooms * 50000) + 
                  (criteria.bathrooms * 25000) + 
                  (criteria.garage ? 20000 : 0) + 
                  (criteria.location.length > 0 ? 15000: 0);
    
    if (criteria.estimatedPrice !== price) {
        setCriteria(c => ({...c, estimatedPrice: price}));
    }
  }, [criteria.autoEstimate, criteria.bedrooms, criteria.bathrooms, criteria.garage, criteria.location]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setActivePage(Page.Dashboard);
  };

  const renderPage = () => {
    if (!isAuthenticated) {
      if (activePage === Page.SignUp) {
        return (
          <SignUp
            onSuccess={handleAuthSuccess}
            onSwitch={() => setActivePage(Page.SignIn)}
          />
        );
      }

      return (
        <SignIn
          onSuccess={handleAuthSuccess}
          onSwitch={() => setActivePage(Page.SignUp)}
        />
      );
    }

    switch (activePage) {
      case Page.Dashboard:
        return <Dashboard 
                  profile={profile} 
                  criteria={criteria} 
                  setActivePage={setActivePage} 
                  interestRate={interestRate} 
                  loanTerm={loanTerm} 
                />;
      case Page.Profile:
        return <Profile 
            profile={profile} 
            setProfile={setProfile} 
            bankAnalysis={bankAnalysis} 
            setBankAnalysis={setBankAnalysis}
            criteria={criteria}
            setCriteria={setCriteria}
            setActivePage={setActivePage}
        />;
      case Page.Learning:
        return <Learning />;
      case Page.Simulator:
        return <Simulator profile={profile} criteria={criteria}/>;
      case Page.Insights:
        return <Insights profile={profile} />;
      case Page.FinancialReport:
        return (
          <FinancialReport
            bankAnalysis={bankAnalysis}
            profile={profile}
            setActivePage={setActivePage}
          />
        );
      case Page.Settings:
        return <Settings 
                  criteria={criteria}
                  setCriteria={setCriteria}
                  interestRate={interestRate}
                  setInterestRate={setInterestRate}
                  loanTerm={loanTerm}
                  setLoanTerm={setLoanTerm}
                  setActivePage={setActivePage}
                />
      default:
        return <Dashboard 
                  profile={profile} 
                  criteria={criteria} 
                  setActivePage={setActivePage} 
                  interestRate={interestRate} 
                  loanTerm={loanTerm}
                />;
    }
  };

  return (
    <Layout 
      activePage={activePage} 
      setActivePage={setActivePage} 
      showNav={isAuthenticated}
      hideTopBar={!isAuthenticated || activePage === Page.Profile}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;
