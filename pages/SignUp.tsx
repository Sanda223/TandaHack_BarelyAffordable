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
  const [annualSalary, setAnnualSalary] = useState<number | null>(null);
  const [weeklyIncome, setWeeklyIncome] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState('');
  const [hobbies, setHobbies] = useState<string[]>([]);

  const [bankStatements, setBankStatements] = useState<Array<{ fileName: string } | null>>([null, null, null]);
  const [statementFiles, setStatementFiles] = useState<(File | null)[]>([null, null, null]);
  const [analysisResult, setAnalysisResult] = useState<BankStatementAnalysis | null>(null);
  const [isAnalyzingStatements, setIsAnalyzingStatements] = useState(false);
  const [totalBalance, setTotalBalance] = useState('');

  const [isFirstHomeBuyer, setIsFirstHomeBuyer] = useState(true);
  const [isCitizen, setIsCitizen] = useState<boolean | null>(null);
  const [homePrice, setHomePrice] = useState<number | null>(null);
  const [autoPrice, setAutoPrice] = useState(false);
  const cities: string[] = [];
  const [location, setLocation] = useState('');
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [garage, setGarage] = useState(true);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [autoEstimatePrice, setAutoEstimatePrice] = useState<number | null>(null);
  const [estimatesCache, setEstimatesCache] = useState<
    Array<{ state: string; city: string; bedrooms: number; bathrooms: number; hasGarage: boolean; price: number }>
  >([]);

  const formatNumberInput = (value: number | null) =>
    value !== null && !Number.isNaN(value) ? value.toLocaleString() : '';

  const parseNumberInput = (value: string): number | null => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    return Math.round(Number(cleaned));
  };

  const knownCities = ['SYDNEY', 'MELBOURNE', 'BRISBANE', 'ADELAIDE', 'PERTH', 'HOBART', 'DARWIN', 'CANBERRA'];

  const normalizeCity = (value: string) => {
    const upper = value.trim().toUpperCase();
    if (!upper) return '';
    const firstSegment = upper.split(',')[0].trim();
    const match = knownCities.find((c) => firstSegment.includes(c) || c.includes(firstSegment));
    return match || firstSegment;
  };

  const loadEstimates = async () => {
    if (estimatesCache.length > 0) return estimatesCache;
    try {
      const res = await fetch('/property_estimates_au.csv');
      if (!res.ok) return [];
      const text = await res.text();
      const rows = text.trim().split('\n').slice(1).map((line) => line.split(','));
      const parsed = rows.map((r) => ({
        state: r[0].toUpperCase(),
        city: r[1].trim().toUpperCase(),
        bedrooms: Number(r[2]),
        bathrooms: Number(r[3]),
        hasGarage: r[4] === '1' || r[4].toLowerCase() === 'true',
        price: Number(r[5]),
      }));
      setEstimatesCache(parsed);
      return parsed;
    } catch {
      return [];
    }
  };

  const estimateFromSpecs = async () => {
    const estimates = await loadEstimates();
    const cityKey = normalizeCity(location);
    const exact = estimates.find(
      (r) =>
        r.city === cityKey &&
        r.bedrooms === bedrooms &&
        r.bathrooms === bathrooms &&
        r.hasGarage === garage
    );
    if (exact) return exact.price;
    const close = estimates.find(
      (r) =>
        r.city === cityKey &&
        r.bedrooms === bedrooms &&
        r.bathrooms === bathrooms
    );
    return close?.price ?? null;
  };

  const handleUseDemoData = async () => {
    try {
      const demoPaths = [
        '/demodata-SpendAccount-6094_2025-08.csv',
        '/demodata-SpendAccount-6094_2025-09.csv',
        '/demodata-SpendAccount-6094_2025-10.csv',
      ];
      // Fetch as blobs to mimic File objects
      const fetched = await Promise.all(
        demoPaths.map(async (path) => {
          const res = await fetch(path);
          const blob = await res.blob();
          return new File([blob], path.split('/').pop() || 'statement.csv', { type: 'text/csv' });
        })
      );

      setBankStatements(fetched.map((file) => ({ fileName: file.name })));
      setStatementFiles(fetched);
      await analyzeIfReady(fetched, jobTitle, employmentType);
    } catch (err) {
      console.error('Demo data load failed', err);
      setError('Unable to load demo data right now. Please try uploading manually.');
    }
  };

  const syncFromAnnual = (value: number | null) => {
    setAnnualSalary(value);
    if (value === null || Number.isNaN(value)) {
      setMonthlyIncome(null);
      setWeeklyIncome(null);
    } else {
      setMonthlyIncome(Math.round(value / 12));
      setWeeklyIncome(Math.round(value / 52));
    }
  };

  const syncFromMonthly = (value: number | null) => {
    setMonthlyIncome(value);
    if (value === null || Number.isNaN(value)) {
      setAnnualSalary(null);
    } else {
      setAnnualSalary(Math.round(value * 12));
    }
  };

  const syncFromWeekly = (value: number | null) => {
    setWeeklyIncome(value);
    if (value === null || Number.isNaN(value)) {
      setMonthlyIncome(null);
      setAnnualSalary(null);
    } else {
      setMonthlyIncome(Math.round((value * 52) / 12));
      setAnnualSalary(Math.round(value * 52));
    }
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
    setAutoPrice(true);
    estimateFromSpecs().then((price) => {
      if (price !== null && !Number.isNaN(price)) {
        const rounded = Math.round(price);
        setAutoEstimatePrice(rounded);
        setHomePrice(rounded);
      } else {
        setAutoEstimatePrice(null);
      }
    });
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
        if (!homePrice && !(autoPrice && autoEstimatePrice !== null)) {
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
      const derivedMonthly =
        monthlyIncome ??
        (weeklyIncome !== null ? Math.round((weeklyIncome * 52) / 12) : null) ??
        (annualSalary !== null ? Math.round(annualSalary / 12) : 0);
      const derivedAnnual =
        annualSalary ??
        (weeklyIncome !== null ? Math.round(weeklyIncome * 52) : null) ??
        (monthlyIncome !== null ? Math.round(monthlyIncome * 12) : 0);

      const profile: UserProfile = {
        jobTitle: jobTitle.trim(),
        jobType: employmentToJobType[employmentType] || 'Salary',
        annualIncome: derivedAnnual ?? 0,
        monthlyIncome: derivedMonthly ?? 0,
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
        estimatedPrice: homePrice ?? 0,
        autoEstimate: autoPrice,
      };

      const user = await registerUser({
        fullName,
        email,
        password,
        profile,
        criteria,
        bankAnalysis: analysisResult,
        totalBalance: Number(totalBalance || 0),
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
            onChange={(e) => {
              const next = e.target.value;
              setEmploymentType(next);
              if (next === 'Full-time') {
                setWeeklyIncome(null);
              } else {
                setAnnualSalary(null);
                setMonthlyIncome(null);
              }
            }}
            aria-label="Employment Type"
          >
            {employmentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
        {employmentType === 'Full-time' ? (
          <>
            <div className="md:col-span-2">
              <input
                type="text"
                className={inputClasses}
                aria-label="Annual Salary ($)"
                value={formatNumberInput(annualSalary)}
                onChange={(e) => {
                  const parsed = parseNumberInput(e.target.value);
                  syncFromAnnual(parsed);
                }}
                placeholder="Annual Salary ($)"
              />
            </div>
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <input
                type="text"
                className={inputClasses}
                aria-label="Weekly Income ($)"
                value={formatNumberInput(weeklyIncome)}
                onChange={(e) => {
                  const parsed = parseNumberInput(e.target.value);
                  syncFromWeekly(parsed);
                }}
                placeholder="Weekly Income ($)"
              />
            </div>
          </>
        )}
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
      </div>
    </Card>
  );

  const renderBankStep = () => (
    <Card>
      <h2 className="text-lg font-semibold text-text-primary mb-3">Bank Statements & Balance</h2>
      <p className="text-sm text-text-secondary">
        Upload separate CSV exports for the past three months. We’ll analyze them to personalize your insights.
      </p>
      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-text-secondary mb-2">
            Enter the total amount you have saved today. We’ll use it to personalize your deposit timeline.
          </p>
          <input
            type="text"
            className={inputClasses}
            aria-label="Total Balance ($)"
            value={formatNumberInput(totalBalance === '' ? null : Number(totalBalance))}
            onChange={(e) => {
              const parsed = parseNumberInput(e.target.value);
              setTotalBalance(parsed === null ? '' : String(parsed));
            }}
            placeholder="Total Balance ($)"
          />
        </div>

        {['Month 1', 'Month 2', 'Month 3'].map((label, index) => {
          const summary = bankStatements[index];
          return (
            <div key={label} className="rounded-2xl border border-dashed border-gray-300 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-primary">{label}</p>
                  <p className="text-xs text-text-secondary">
                    {summary ? summary.fileName : 'Upload a CSV or PDF statement exported from your bank'}
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    id={`bank-upload-${index}`}
                    accept=".csv,.pdf"
                    className="hidden"
                    onChange={handleBankUpload(index)}
                  />
                  <label
                    htmlFor={`bank-upload-${index}`}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Icon name="upload" className="h-4 w-4" />
                    {summary ? 'Replace File' : 'Upload File'}
                  </label>
                </div>
              </div>
              {summary ? (
                <p className="mt-4 text-sm font-semibold text-green-600">Upload complete ✓</p>
              ) : (
                <p className="mt-4 text-xs text-text-secondary italic">Awaiting upload...</p>
              )}
            </div>
          );
        })}

        {isAnalyzingStatements && (
          <p className="text-sm text-text-secondary italic">Crunching the numbers…</p>
        )}
        {!isAnalyzingStatements && analysisResult && (
          <p className="text-sm font-semibold text-green-600">Analysis complete – ready for the next step!</p>
        )}

        {analysisResult && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-light-gray/60 p-3 text-sm text-text-primary">
            <div>
              <p className="text-xs text-text-secondary">Avg Monthly Spend</p>
              <p className="font-semibold">
                ${analysisResult.monthlyAverageSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Avg Monthly Savings</p>
              <p
                className={`font-semibold ${analysisResult.monthlyAverageSavings >= 0 ? 'text-green-600' : 'text-red-500'}`}
              >
                ${analysisResult.monthlyAverageSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  const renderHomeStep = () => (
    <Card>
      <h2 className="text-lg font-semibold text-text-primary mb-3">Dream Home</h2>
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-text-secondary mb-2">Are you an Australian citizen?</div>
          <div className="flex items-center gap-2">
            <Button
              variant={isCitizen === true ? 'primary' : 'secondary'}
              onClick={() => setIsCitizen(true)}
              className="flex-1"
            >
              Yes
            </Button>
            <Button
              variant={isCitizen === false ? 'primary' : 'secondary'}
              onClick={() => setIsCitizen(false)}
              className="flex-1"
            >
              No
            </Button>
          </div>
        </div>

        {isCitizen === true && (
          <div>
            <div className="text-sm font-medium text-text-secondary mb-2">First home buyer?</div>
            <div className="flex items-center gap-2">
              <Button
                variant={isFirstHomeBuyer ? 'primary' : 'secondary'}
                onClick={() => setIsFirstHomeBuyer(true)}
                className="flex-1"
              >
                Yes
              </Button>
              <Button
                variant={!isFirstHomeBuyer ? 'primary' : 'secondary'}
                onClick={() => setIsFirstHomeBuyer(false)}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 border-t border-gray-200 pt-4 space-y-4">
        <input
          type="number"
          className={inputClasses}
          value={autoPrice && autoEstimatePrice !== null ? autoEstimatePrice : homePrice ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setHomePrice(val === '' ? null : Number(val));
            setAutoPrice(false);
            setAutoEstimatePrice(null);
          }}
          disabled={autoPrice}
          aria-label="Target Price"
          placeholder="Target Price"
        />
        {autoEstimatePrice !== null && autoPrice && (
          <p className="mt-1 text-xs font-semibold text-primary">
            Auto-estimated price: ${autoEstimatePrice.toLocaleString()}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoPrice}
              onChange={(e) => {
                const checked = e.target.checked;
                setAutoPrice(checked);
                if (checked) {
                  handleEstimatePrice();
                } else {
                  setAutoEstimatePrice(null);
                }
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Estimate price automatically from specs</span>
          </label>
        </div>
        {autoPrice && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <input
                  type="text"
                  className={inputClasses}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  aria-label="Location"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-text-secondary mb-1">Does it have a garage?</div>
                <div className="mt-1 flex gap-2">
                  <Button
                    variant={garage ? 'primary' : 'secondary'}
                    onClick={() => setGarage(true)}
                    className="flex-1"
                  >
                    Yes
                  </Button>
                  <Button
                    variant={!garage ? 'primary' : 'secondary'}
                    onClick={() => setGarage(false)}
                    className="flex-1"
                  >
                    No
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={bedrooms}
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
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <p className="text-xs text-text-secondary mt-1">{bathrooms} bathrooms</p>
              </div>
            </div>
          </div>
        )}
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
        <div className="mt-4 space-y-3">
          {currentStep === 2 && (
            <Button variant="secondary" onClick={handleUseDemoData} className="w-full">
              Use demo data
            </Button>
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
                Create
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleNextStep}>
                Next
              </Button>
            )}
          </div>
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
