import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from '../components/Icon';
import logo from '../assets/logo.png';
import { BankStatementAnalysis, HomeCriteria, PublicUser, UserProfile } from '../types';
import { registerUser } from '../services/authService';
import { analyzeBankStatements } from '../services/bankAnalyzer';

interface SignUpProps {
  onSuccess: (user: PublicUser) => void;
  onSwitch: () => void;
}

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const employmentTypes = ['Full-time', 'Part-time', 'Casual', 'Contract'];
const steps = ['Account', 'Job & Skills', 'Bank Statement', 'Dream Home'];

const employmentToJobType: Record<string, UserProfile['jobType']> = {
  'Full-time': 'Salary',
  'Part-time': 'Hourly',
  Contract: 'Contract',
  Casual: 'Casual',
};

const SignUp: React.FC<SignUpProps> = ({ onSuccess, onSwitch }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === steps.length - 1;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [jobTitle, setJobTitle] = useState('');
  const [employmentType, setEmploymentType] = useState(employmentTypes[0]);
  const [annualSalary, setAnnualSalary] = useState(85000);
  const [monthlyIncome, setMonthlyIncome] = useState(annualSalary / 12);
  const [skills, setSkills] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState('');
  const [hobbies, setHobbies] = useState<string[]>([]);

  const [bankStatements, setBankStatements] = useState<Array<{ fileName: string } | null>>([null, null, null]);
  const [statementFiles, setStatementFiles] = useState<(File | null)[]>([null, null, null]);
  const [analysisResult, setAnalysisResult] = useState<BankStatementAnalysis | null>(null);
  const [isAnalyzingStatements, setIsAnalyzingStatements] = useState(false);
  const [totalBalance, setTotalBalance] = useState('');

  const [isFirstHomeBuyer, setIsFirstHomeBuyer] = useState(true);
  const [homePrice, setHomePrice] = useState(550000);
  const [autoPrice, setAutoPrice] = useState(false);
  const [location, setLocation] = useState('');
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [garage, setGarage] = useState(true);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const syncFromAnnual = (value: number) => {
    setAnnualSalary(value);
    setMonthlyIncome(Number((value / 12).toFixed(2)));
  };

  const syncFromMonthly = (value: number) => {
    setMonthlyIncome(value);
    setAnnualSalary(Number((value * 12).toFixed(2)));
  };

  const handleAddHobby = () => {
    if (!hobbyInput.trim()) return;
    if (!hobbies.includes(hobbyInput.trim())) {
      setHobbies(prev => [...prev, hobbyInput.trim()]);
    }
    setHobbyInput('');
  };

  const handleGenerateSkills = () => {
    if (!jobTitle.trim()) return;
    const mockSkills = ['Budgeting', 'Stakeholder comms', 'Market research', 'Copywriting', 'Excel wizard'];
    const shuffled = [...mockSkills].sort(() => Math.random() - 0.5);
    setSkills(shuffled.slice(0, 4));
  };

  const analyzeIfReady = async (
    files: (File | null)[],
    employerHint: string,
    employmentTypeValue: string,
  ) => {
    if (files.some((file) => !file)) return;
    try {
      setIsAnalyzingStatements(true);
      setError('');
      const result = await analyzeBankStatements(files as File[], {
        employerHint,
        employmentType: employmentTypeValue,
      });
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setAnalysisResult(null);
      setError('We could not analyze your statements. Please check the CSV format and try again.');
    } finally {
      setIsAnalyzingStatements(false);
    }
  };

  const handleBankUpload = (monthIndex: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setBankStatements(prev => {
      const next = [...prev];
      next[monthIndex] = { fileName: file.name };
      return next;
    });
    setStatementFiles(prev => {
      const next = [...prev];
      next[monthIndex] = file;
      return next;
    });
    setAnalysisResult(null);
    const updatedFiles = statementFiles.map((existing, idx) => (idx === monthIndex ? file : existing));
    analyzeIfReady(updatedFiles, jobTitle, employmentType);
  };

  useEffect(() => {
    if (statementFiles.every((file) => file)) {
      analyzeIfReady(statementFiles, jobTitle, employmentType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTitle, employmentType]);

  const handleEstimatePrice = () => {
    const base = 300000;
    const estimate =
      base +
      bedrooms * 50000 +
      bathrooms * 30000 +
      (garage ? 20000 : 0) +
      (location ? 15000 : 0);
    setHomePrice(estimate);
    setAutoPrice(true);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
          setError('Please complete your account details first.');
          return false;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return false;
        }
        if (!acceptTerms) {
          setError('Please accept the terms to continue.');
          return false;
        }
        return true;
      case 1:
        if (!jobTitle.trim()) {
          setError('Add your job title so we can tailor skills.');
          return false;
        }
        if (hobbies.length === 0) {
          setError('Add at least one hobby. This helps us recommend side income ideas.');
          return false;
        }
        return true;
      case 2:
        if (!totalBalance.trim()) {
          setError('Enter your current total balance so we know where you stand today.');
          return false;
        }
        if (Number.isNaN(Number(totalBalance))) {
          setError('Enter a valid number for your total balance.');
          return false;
        }
        if (statementFiles.some(statement => !statement)) {
          setError('Upload all three monthly CSV statements so we can analyze your cash flow.');
          return false;
        }
        if (!analysisResult) {
          setError('We are still analyzing your statements. Please wait a moment.');
          return false;
        }
        return true;
      case 3:
        if (!homePrice) {
          setError('Set a target home price or estimate it automatically.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    setError('');
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;
    setIsLoading(true);
    setError('');
    try {
      const profile: UserProfile = {
        jobTitle: jobTitle.trim(),
        jobType: employmentToJobType[employmentType] || 'Salary',
        annualIncome: annualSalary,
        monthlyIncome,
        hobbies,
        skills,
      };

      const criteria: HomeCriteria = {
        bedrooms,
        bathrooms,
        location,
        garage,
        propertyType: 'House',
        isFirstHomeBuyer,
        estimatedPrice: homePrice,
        autoEstimate: autoPrice,
      };

      const user = await registerUser({
        fullName,
        email,
        password,
        profile,
        criteria,
        bankAnalysis: analysisResult,
        totalBalance: Number(totalBalance),
      });
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sorry, we could not create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAccountStep = () => (
    <Card>
      <h2 className="text-lg font-semibold text-text-primary mb-3">Account</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <input
            type="text"
            className={inputClasses}
            aria-label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
          />
        </div>
        <div>
          <input
            type="email"
            className={inputClasses}
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
        <div>
          <input
            type="password"
            className={inputClasses}
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        <div>
          <input
            type="password"
            className={inputClasses}
            aria-label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
          />
        </div>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-light-gray/50 px-4 py-3 text-sm text-text-secondary">
        <input
          type="checkbox"
          className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
        />
        <span>
          I agree to the{" "}
          <a
            className="font-semibold text-primary hover:text-accent underline"
            href="/Terms_of_Use_and_Privacy_Policy.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms & Privacy Policy
          </a>
        </span>
      </label>
    </Card>
  );

  const renderJobStep = () => (
    <Card>
      <h2 className="text-lg font-semibold text-text-primary mb-3">Job & Skills</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <input
            type="text"
            className={inputClasses}
            aria-label="Job Title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Job Title"
          />
        </div>
        <div>
          <select
            className={inputClasses}
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            aria-label="Employment Type"
          >
            {employmentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
        <div>
          <input
            type="number"
            className={inputClasses}
            aria-label="Annual Salary ($)"
            value={annualSalary}
            onChange={(e) => syncFromAnnual(Number(e.target.value))}
            placeholder="Annual Salary ($)"
          />
        </div>
        <div>
          <input
            type="number"
            className={inputClasses}
            aria-label="Monthly Income ($)"
            value={monthlyIncome}
            onChange={(e) => syncFromMonthly(Number(e.target.value))}
            placeholder="Monthly Income ($)"
          />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              className={inputClasses}
              value={hobbyInput}
              onChange={(e) => setHobbyInput(e.target.value)}
              placeholder="Hobbies"
              aria-label="Hobbies"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHobby())}
            />
            <Button variant="secondary" onClick={handleAddHobby}>Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {hobbies.map((hobby) => (
              <span key={hobby} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{hobby}</span>
            ))}
          </div>
        </div>
        <div>
          <Button
            variant="secondary"
            onClick={handleGenerateSkills}
            disabled={!jobTitle.trim()}
          >
            Generate skills with AI placeholder <Icon name="sparkles" className="ml-2 h-4 w-4" />
          </Button>
          {skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map(skill => (
                <span key={skill} className="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700">{skill}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const renderBankStep = () => (
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Bank Statements</h2>
        <p className="text-sm text-text-secondary">Upload three consecutive months (CSV). We'll analyze cash flow.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((idx) => (
          <div key={idx} className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-light-gray/40 p-3">
            <label className="text-xs font-semibold text-text-secondary">Month {idx + 1}</label>
            <input
              type="file"
              accept=".csv"
              className="text-xs"
              onChange={handleBankUpload(idx)}
            />
            <span className="text-xs text-text-primary break-all">
              {bankStatements[idx]?.fileName || 'No file chosen'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <input
            type="number"
            className={inputClasses}
            aria-label="Total Balance ($)"
            value={totalBalance}
            onChange={(e) => setTotalBalance(e.target.value)}
            placeholder="Total Balance ($)"
          />
        </div>
        <div className="flex items-end">
          <p className="text-xs text-text-secondary">
            We'll use this to personalise your current savings and ETA.
          </p>
        </div>
      </div>
      {isAnalyzingStatements && (
        <div className="mt-4 rounded-xl bg-light-gray/80 px-4 py-3 text-sm text-text-secondary">
          Analyzing statements...
        </div>
      )}
      {analysisResult && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-light-gray/60 p-3 text-sm text-text-primary">
          <div>
            <p className="text-xs text-text-secondary">Avg Monthly Spend</p>
            <p className="font-semibold">${analysisResult.monthlyAverageSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Avg Monthly Savings</p>
            <p className="font-semibold text-green-600">${analysisResult.monthlyAverageSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      )}
    </Card>
  );

  const renderHomeStep = () => (
    <Card>
      <h2 className="text-lg font-semibold text-text-primary mb-3">Dream Home</h2>
      <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
        <span>First home buyer?</span>
        <Button
          variant={isFirstHomeBuyer ? 'primary' : 'secondary'}
          onClick={() => setIsFirstHomeBuyer(true)}
        >
          Yes
        </Button>
        <Button
          variant={!isFirstHomeBuyer ? 'primary' : 'secondary'}
          onClick={() => setIsFirstHomeBuyer(false)}
        >
          No
        </Button>
      </div>
      <div className="mt-4">
        <input
          type="number"
          className={inputClasses}
          value={homePrice}
          onChange={(e) => {
            setHomePrice(Number(e.target.value));
            setAutoPrice(false);
          }}
          disabled={autoPrice}
          aria-label="Target Price"
          placeholder="Target Price"
        />
        <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary flex-wrap">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoPrice}
              onChange={(e) => setAutoPrice(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Estimate price automatically from specs</span>
          </label>
          <Button variant="secondary" onClick={handleEstimatePrice} className="text-xs">
            Run mock AI estimate
          </Button>
        </div>
      </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <input
              type="text"
              className={inputClasses}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              aria-label="Location"
              disabled={!autoPrice}
            />
          </div>
          <div>
            <div className="mt-1 flex gap-2">
              <Button
                variant={garage ? 'primary' : 'secondary'}
              onClick={() => setGarage(true)}
              disabled={!autoPrice}
              className="flex-1"
            >
              Yes
            </Button>
            <Button
              variant={!garage ? 'primary' : 'secondary'}
              onClick={() => setGarage(false)}
              disabled={!autoPrice}
              className="flex-1"
            >
              No
            </Button>
          </div>
        </div>
      </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <input
              type="range"
              min={1}
              max={5}
            step={1}
            value={bedrooms}
            disabled={!autoPrice}
            onChange={(e) => setBedrooms(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="text-xs text-text-secondary mt-1">{bedrooms} bedrooms</p>
        </div>
          <div>
            <input
              type="range"
              min={1}
            max={4}
            step={1}
            value={bathrooms}
            disabled={!autoPrice}
            onChange={(e) => setBathrooms(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="text-xs text-text-secondary mt-1">{bathrooms} bathrooms</p>
        </div>
      </div>
    </Card>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderAccountStep();
      case 1:
        return renderJobStep();
      case 2:
        return renderBankStep();
      case 3:
        return renderHomeStep();
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col space-y-6 px-4 -mt-8 pb-2">
      <div className="text-center">
        <div className="mx-auto flex h-60 w-60 sm:h-64 sm:w-64 items-center justify-center -mb-20">
          <img src={logo} alt="Days-to" className="block h-full w-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">Let’s add your details</h1>
        <p className="mt-1 text-sm text-text-secondary">
          We’ll use these to personalize your insights.
        </p>
      </div>

      {currentStep > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-text-secondary">Step {currentStep + 1} of {steps.length}</p>
              <h2 className="text-lg font-semibold text-text-primary">{steps[currentStep]}</h2>
            </div>
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <span
                  key={index}
                  className={`h-2 w-10 rounded-full ${index <= currentStep ? 'bg-primary' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card>
        {renderStepContent()}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <Button variant="secondary" onClick={handlePrevStep} className="flex-1">
              Back
            </Button>
          ) : (
            <span />
          )}
          {isLastStep ? (
            <Button className="flex-1" onClick={handleSubmit} isLoading={isLoading}>
              Create Account
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleNextStep}>
              Next
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4">
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <button
            type="button"
            className="font-semibold text-primary hover:text-accent"
            onClick={onSwitch}
          >
            Sign in
          </button>
        </p>
      </div>

    </div>
  );
};

export default SignUp;
