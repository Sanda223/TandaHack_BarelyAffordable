import React, { useState, useEffect } from 'react';
import { Page, UserProfile, BankStatementAnalysis, HomeCriteria, PublicUser } from './types';
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
import { getCurrentUser, persistAuthenticatedState, signOutUser } from './services/authService';

const defaultProfile: UserProfile = {
  jobTitle: 'Software Engineer',
  jobType: 'Salary',
  annualIncome: 90000,
  monthlyIncome: 7500,
  hobbies: ['Coding', 'Hiking', 'Photography'],
  skills: ['React', 'TypeScript', 'Node.js'],
};

const defaultCriteria: HomeCriteria = {
  bedrooms: 3,
  bathrooms: 2,
  location: 'Austin, TX',
  garage: true,
  propertyType: 'House',
  isFirstHomeBuyer: true,
  estimatedPrice: 550000,
  autoEstimate: false,
};

const createInitialProfile = (): UserProfile => ({
  ...defaultProfile,
  hobbies: [...defaultProfile.hobbies],
  skills: [...defaultProfile.skills],
});

const createInitialCriteria = (): HomeCriteria => ({
  ...defaultCriteria,
});

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.SignIn);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(() => createInitialProfile());

  const [bankAnalysis, setBankAnalysis] = useState<BankStatementAnalysis | null>(null);

  const [criteria, setCriteria] = useState<HomeCriteria>(() => createInitialCriteria());

  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [totalBalance, setTotalBalance] = useState<number | null>(null);

  const wrapContent = (content: React.ReactNode) => (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-3xl bg-background p-4 sm:p-6">
        {content}
      </div>
    </div>
  );

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

  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setCurrentUserId(savedUser.id);
      setProfile(savedUser.profile);
      setCriteria(savedUser.criteria);
      setFullName(savedUser.fullName);
      setBankAnalysis(savedUser.bankAnalysis ?? null);
      setTotalBalance(savedUser.totalBalance ?? null);
      setIsAuthenticated(true);
      setActivePage(Page.Dashboard);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    persistAuthenticatedState(currentUserId, { profile, criteria, bankAnalysis, totalBalance });
  }, [profile, criteria, bankAnalysis, totalBalance, isAuthenticated, currentUserId]);

  const handleAuthSuccess = (user: PublicUser) => {
    setCurrentUserId(user.id);
    setProfile(user.profile);
    setCriteria(user.criteria);
    setFullName(user.fullName);
    setBankAnalysis(user.bankAnalysis ?? null);
    setTotalBalance(user.totalBalance ?? null);
    setIsAuthenticated(true);
    setActivePage(Page.Dashboard);
  };

  const handleSignOut = () => {
    signOutUser();
    setCurrentUserId(null);
    setIsAuthenticated(false);
    setActivePage(Page.SignIn);
    setFullName('');
    setBankAnalysis(null);
    setTotalBalance(null);
    setProfile(createInitialProfile());
    setCriteria(createInitialCriteria());
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
        return wrapContent(
          <Dashboard 
            profile={profile} 
            criteria={criteria} 
            setActivePage={setActivePage} 
            interestRate={interestRate} 
            loanTerm={loanTerm} 
            fullName={fullName}
            totalBalance={totalBalance}
            bankAnalysis={bankAnalysis}
          />
        );
      case Page.Profile:
        return wrapContent(
          <Profile 
            profile={profile} 
            setProfile={setProfile} 
            bankAnalysis={bankAnalysis} 
            setBankAnalysis={setBankAnalysis}
            criteria={criteria}
            setCriteria={setCriteria}
            setActivePage={setActivePage}
            fullName={fullName}
            onSignOut={handleSignOut}
          />
        );
      case Page.Learning:
        return wrapContent(<Learning />);
      case Page.Simulator:
        return wrapContent(<Simulator profile={profile} criteria={criteria}/>);
      case Page.Insights:
        return wrapContent(<Insights profile={profile} />);
      case Page.FinancialReport:
        return wrapContent(
          <FinancialReport
            bankAnalysis={bankAnalysis}
            profile={profile}
            setActivePage={setActivePage}
          />
        );
      case Page.Settings:
        return wrapContent(
          <Settings 
            criteria={criteria}
            setCriteria={setCriteria}
            interestRate={interestRate}
            setInterestRate={setInterestRate}
            loanTerm={loanTerm}
            setLoanTerm={setLoanTerm}
            setActivePage={setActivePage}
            onSignOut={handleSignOut}
          />
        );
      default:
        return wrapContent(
          <Dashboard 
            profile={profile} 
            criteria={criteria} 
            setActivePage={setActivePage} 
            interestRate={interestRate} 
            loanTerm={loanTerm}
            fullName={fullName}
            totalBalance={totalBalance}
            bankAnalysis={bankAnalysis}
          />
        );
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
