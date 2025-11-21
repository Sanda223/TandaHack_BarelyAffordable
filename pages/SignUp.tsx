import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from '../components/Icon';

interface SignUpProps {
  onSuccess: () => void;
  onSwitch: () => void;
}

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const employmentTypes = ['Full-time', 'Part-time', 'Casual', 'Contract'];
const steps = ['Account', 'Job & Skills', 'Bank Statement', 'Dream Home'];

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

  const [bankSummary, setBankSummary] = useState<{ savings: number; spend: number } | null>(null);

  const [isFirstHomeBuyer, setIsFirstHomeBuyer] = useState(true);
  const [homePrice, setHomePrice] = useState(550000);
  const [autoPrice, setAutoPrice] = useState(false);
  const [location, setLocation] = useState('');
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [garage, setGarage] = useState(true);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleBankUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setTimeout(() => {
      const savings = Math.round(1000 + Math.random() * 2000);
      const spend = Math.round(2500 + Math.random() * 1500);
      setBankSummary({ savings, spend });
    }, 800);
  };

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
        if (!bankSummary) {
          setError('Upload a bank statement so we can analyze your cash flow.');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 1200);
  };

  const renderAccountStep = () => (
    <Card>
      <h2 className="text-lg font-semibold text-text-primary mb-3">Account</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-text-secondary">Full Name</label>
          <input
            type="text"
            className={`${inputClasses} mt-1`}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Sam Lee"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary">Email</label>
          <input
            type="email"
            className={`${inputClasses} mt-1`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
        <div>
          <label className="text-sm font-medium text-text-secondary">Password</label>
          <input
            type="password"
            className={`${inputClasses} mt-1`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary">Confirm Password</label>
          <input
            type="password"
            className={`${inputClasses} mt-1`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
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
          I agree to the{' '}
          <button type="button" className="font-semibold text-primary hover:text-accent">
            Terms & Privacy Policy
          </button>
        </span>
      </label>
    </Card>
  );

  const renderJobStep = () => (
    <Card>
      <h2 className="text-lg font-semibold text-text-primary mb-3">Job & Skills</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-text-secondary">Job Title</label>
          <input
            type="text"
            className={`${inputClasses} mt-1`}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g., Product Manager"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary">Employment Type</label>
          <select
            className={`${inputClasses} mt-1`}
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
          >
            {employmentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
        <div>
          <label className="text-sm font-medium text-text-secondary">Annual Salary ($)</label>
          <input
            type="number"
            className={`${inputClasses} mt-1`}
            value={annualSalary}
            onChange={(e) => syncFromAnnual(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary">Monthly Income ($)</label>
          <input
            type="number"
            className={`${inputClasses} mt-1`}
            value={monthlyIncome}
            onChange={(e) => syncFromMonthly(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-sm font-medium text-text-secondary">Hobbies</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              className={inputClasses}
              value={hobbyInput}
              onChange={(e) => setHobbyInput(e.target.value)}
              placeholder="e.g., Photography"
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
      <h2 className="text-lg font-semibold text-text-primary mb-3">Bank Statement</h2>
      <p className="text-sm text-text-secondary">Upload the past 3 months (CSV or PDF). We’ll simulate insights for now.</p>
      <div className="mt-3">
        <input type="file" id="bank-upload" accept=".csv,.pdf" className="hidden" onChange={handleBankUpload} />
        <label
          htmlFor="bank-upload"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
        >
          <Icon name="upload" className="h-5 w-5" /> Upload statement
        </label>
      </div>
      {bankSummary ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-light-gray/80 px-4 py-3">
            <p className="text-xs text-text-secondary">Avg Monthly Savings</p>
            <p className="text-lg font-bold text-primary">${bankSummary.savings.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-light-gray/80 px-4 py-3">
            <p className="text-xs text-text-secondary">Avg Monthly Spend</p>
            <p className="text-lg font-bold text-red-500">${bankSummary.spend.toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-secondary">No file processed yet.</p>
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
        <label className="text-sm font-medium text-text-secondary">Target Price</label>
        <input
          type="number"
          className={`${inputClasses} mt-1`}
          value={homePrice}
          onChange={(e) => {
            setHomePrice(Number(e.target.value));
            setAutoPrice(false);
          }}
          disabled={autoPrice}
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
          <label className="text-sm font-medium text-text-secondary">Location</label>
          <input
            type="text"
            className={`${inputClasses} mt-1`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City or suburb"
            disabled={!autoPrice}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary">Garage</label>
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
          <label className="text-sm font-medium text-text-secondary">Bedrooms</label>
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
          <label className="text-sm font-medium text-text-secondary">Bathrooms</label>
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
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col space-y-6 px-4 py-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Icon name="sparkles" className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">Let’s capture your details</h1>
        <p className="mt-1 text-sm text-text-secondary">
          We’ll use these to personalize your insights. AI powered fields return mock values while we prototype.
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

      {renderStepContent()}

      <Card>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
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
  );
};

export default SignUp;
