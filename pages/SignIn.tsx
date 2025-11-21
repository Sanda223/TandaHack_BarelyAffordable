import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from '../components/Icon';

interface SignInProps {
  onSuccess: () => void;
  onSwitch: () => void;
}

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const SignIn: React.FC<SignInProps> = ({ onSuccess, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in your email and password.');
      return;
    }

    setIsLoading(true);
    setError('');
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 900);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center space-y-6 px-4 py-8">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon name="home" className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">Welcome Back</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Sign in to continue tracking your path to homeownership.
        </p>
      </div>

      <Card>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className={`${inputClasses} mt-1`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className={`${inputClasses} mt-1`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-text-secondary">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button type="button" className="font-semibold text-primary hover:text-accent">
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-text-secondary">
        Don't have an account?{' '}
        <button
          type="button"
          className="font-semibold text-primary hover:text-accent"
          onClick={onSwitch}
        >
          Create one
        </button>
      </p>
    </div>
  );
};

export default SignIn;
