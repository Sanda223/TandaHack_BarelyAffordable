import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import logo from '../assets/logo.png';
import { PublicUser } from '../types';
import { signInWithSupabase } from '../services/supabaseAuth';

interface SignInProps {
  onSuccess: (user: PublicUser) => void;
  onSwitch: () => void;
}

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const SignIn: React.FC<SignInProps> = ({ onSuccess, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const rememberMe = true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in your email and password.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const user = await signInWithSupabase(email, password);
      onSuccess(user);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to sign in right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-start px-4 pt-4 pb-8">
      <div className="text-center">
        <div className="mx-auto flex h-60 w-60 sm:h-64 sm:w-64 items-center justify-center -mb-16">
          <img src={logo} alt="Days-to" className="block h-full w-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary leading-tight -mt-1">Welcome Back</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Sign in to continue tracking your path to homeownership.
        </p>
      </div>

      <div className="mt-4">
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
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>

          <div className="flex justify-center">
            <button type="button" className="text-sm font-semibold text-primary hover:text-accent">
              Forgot password?
            </button>
          </div>
        </form>
      </Card>
      </div>

      <div className="mt-4">
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
    </div>
  );
};

export default SignIn;
