import React from 'react';
import { HomeCriteria, Page } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from '../components/Icon';

interface SettingsProps {
  criteria: HomeCriteria;
  setCriteria: React.Dispatch<React.SetStateAction<HomeCriteria>>;
  loanTerm: number;
  setLoanTerm: React.Dispatch<React.SetStateAction<number>>;
  interestRate: number;
  setInterestRate: React.Dispatch<React.SetStateAction<number>>;
  setActivePage: (page: Page) => void;
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = 
({ label, value, onChange, min, max, step, unit = '', formatValue, disabled = false }) => (
  <div>
    <label className="flex justify-between text-sm font-medium text-text-secondary mb-2">
      <span>{label}</span>
      <span className="font-bold text-text-primary">
        {formatValue ? formatValue(value) : `${value}${unit}`}
      </span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full h-2 rounded-lg appearance-none ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} bg-gray-200 accent-accent`}
    />
  </div>
);

const InputField: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        {children}
    </div>
);

const Settings: React.FC<SettingsProps> = ({ criteria, setCriteria, loanTerm, setLoanTerm, interestRate, setInterestRate, setActivePage }) => {
  const propertyTypes: HomeCriteria['propertyType'][] = ['House', 'Apartment', 'Townhouse'];
  
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-primary">Financial Settings</h1>
        <p className="text-text-secondary mt-1 flex items-center">
          Adjust your profile and loan assumptions.
          <Icon name="settings" className="w-4 h-4 ml-2" />
        </p>
      </header>

      <Card>
        <h2 className="text-xl font-bold text-text-primary mb-6">Buyer Profile</h2>
        <InputField label="Are you a first-time home buyer?">
            <div className="flex items-center space-x-2 mt-2">
                <Button variant={criteria.isFirstHomeBuyer ? 'primary': 'secondary'} onClick={() => setCriteria({...criteria, isFirstHomeBuyer: true})} className="w-full">Yes</Button>
                <Button variant={!criteria.isFirstHomeBuyer ? 'primary': 'secondary'} onClick={() => setCriteria({...criteria, isFirstHomeBuyer: false})} className="w-full">No</Button>
            </div>
            <p className="text-xs text-text-secondary mt-2">This affects your minimum deposit requirements and potential grants.</p>
        </InputField>
      </Card>
      
      <Card>
        <h2 className="text-xl font-bold text-text-primary mb-6">Loan Assumptions</h2>
        <div className="space-y-5">
            <div>
              <Slider
                label="Interest Rate"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                min={2} max={10} step={0.1} unit="%"
              />
              <p className="text-xs text-text-secondary mt-1">
                Most fixed interest rates sit between <span className="font-semibold text-text-primary">5–7%</span>.
              </p>
            </div>
            <div>
              <Slider
                label="Loan Term"
                value={loanTerm}
                onChange={(e) => setLoanTerm(Number(e.target.value))}
                min={10} max={30} step={5} unit=" years"
              />
              <p className="text-xs text-text-secondary mt-1">
                Standard loan terms are <span className="font-semibold text-text-primary">15 or 30 years</span>.
              </p>
            </div>
        </div>
        <div className="mt-6 rounded-xl bg-light-gray/60 p-3 text-xs text-text-secondary flex flex-wrap items-center gap-1">
          Not sure what to pick?
          <button
            type="button"
            className="font-semibold text-primary hover:text-accent"
            onClick={() => setActivePage(Page.Learning)}
          >
            Learn more about loan types here.
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-text-primary mb-6">Home Criteria</h2>
        <div className="space-y-5">
          <Slider
            label="Target Purchase Price"
            value={criteria.estimatedPrice}
            onChange={(e) => setCriteria({ ...criteria, estimatedPrice: Number(e.target.value), autoEstimate: false })}
            min={200000}
            max={1500000}
            step={10000}
            formatValue={(val) => criteria.autoEstimate ? 'Auto-calculated' : `$${val.toLocaleString()}`}
            disabled={criteria.autoEstimate}
          />
          <div className="rounded-2xl border border-dashed border-gray-300 bg-light-gray/60 p-4">
            <p className="text-sm font-semibold text-text-primary">Not sure about your price range?</p>
            <p className="text-xs text-text-secondary mt-1 mb-3">Toggle below to estimate based on bedrooms, bathrooms, and other criteria.</p>
            <label className="flex items-center space-x-2 text-sm font-medium text-text-primary">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                checked={criteria.autoEstimate}
                onChange={(e) => setCriteria({ ...criteria, autoEstimate: e.target.checked })}
              />
              <span>I don't know my target price yet</span>
            </label>
          </div>

          {criteria.autoEstimate && (
            <>
              <InputField label="Preferred Location">
                <input
                  type="text"
                  value={criteria.location}
                  onChange={(e) => setCriteria({ ...criteria, location: e.target.value })}
                  className="w-full p-3 bg-white border rounded-xl border-gray-300 shadow-sm text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="City or suburb"
                />
              </InputField>
              <div className="grid grid-cols-1 gap-4">
                <Slider
                  label="Bedrooms"
                  value={Math.min(Math.max(criteria.bedrooms, 1), 4)}
                  onChange={(e) => setCriteria({ ...criteria, bedrooms: Number(e.target.value) })}
                  min={1}
                  max={4}
                  step={1}
                  formatValue={(val) => `${val} bedrooms`}
                />
                <Slider
                  label="Bathrooms"
                  value={Math.min(Math.max(criteria.bathrooms, 1), 4)}
                  onChange={(e) => setCriteria({ ...criteria, bathrooms: Number(e.target.value) })}
                  min={1}
                  max={4}
                  step={1}
                  formatValue={(val) => `${val} bathrooms`}
                />
              </div>
              <InputField label="Property Type">
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {propertyTypes.map((type) => (
                    <Button
                      key={type}
                      variant={criteria.propertyType === type ? 'primary' : 'secondary'}
                      onClick={() => setCriteria({ ...criteria, propertyType: type })}
                      className="text-sm"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </InputField>
              <InputField label="Garage">
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    variant={criteria.garage ? 'primary' : 'secondary'}
                    onClick={() => setCriteria({ ...criteria, garage: true })}
                    className="w-full"
                  >
                    Yes
                  </Button>
                  <Button
                    variant={!criteria.garage ? 'primary' : 'secondary'}
                    onClick={() => setCriteria({ ...criteria, garage: false })}
                    className="w-full"
                  >
                    No
                  </Button>
                </div>
              </InputField>
              <p className="text-xs text-text-secondary">
                We'll auto-calculate your price using these preferences and update your deposit goal.
              </p>
            </>
          )}
        </div>
      </Card>

      <Button onClick={() => setActivePage(Page.Dashboard)} variant="secondary" className="w-full">
        Back to Dashboard
      </Button>
    </div>
  );
};

export default Settings;
