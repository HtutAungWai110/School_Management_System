'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginWithEmail, signUpWithEmail } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

type FormValues = {
  fullName: string;
  email: string;
  password: string;
};

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) console.error(error.message);
  };

  const onSubmit = async (data: FormValues) => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (mode === 'signup') {
      formData.append('fullName', data.fullName);
      await signUpWithEmail(formData);
    } else {
      await loginWithEmail(formData);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center">
          <Image
            src={"/codepoint_logo.png"}
            alt="CodePoint Academy"
            width={200}
            height={200}
          />
        </div>
        <h1 className="text-[26px] font-bold tracking-tight text-primary">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {mode === 'login'
            ? 'Sign in to your learning dashboard'
            : 'Start your learning journey'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface" htmlFor="fullName">
              Full name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <Input
                id="fullName"
                {...register('fullName', {
                  required: 'Name is required',
                  minLength: { value: 4, message: 'Name must be at least 4 characters' },
                  maxLength: { value: 20, message: 'Name must be at most 20 characters' },
                })}
                type="text"
                placeholder="Enter your full name"
                className="pl-10"
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-destructive my-3">{errors.fullName.message}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-on-surface" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <Input
              id="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Invalid email address',
                },
              })}
              type="text"
              placeholder="name@example.com"
              className="pl-10"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive my-3">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-on-surface" htmlFor="password">
              Password
            </label>
            {mode === 'login' && (
              <a href="#" className="text-xs font-medium text-secondary transition-colors hover:text-primary">
                Forgot?
              </a>
            )}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <Input
              id="password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                validate: (value) => {
                  if (/\s/.test(value)) return 'Password cannot contain spaces';
                  return true;
                },
              })}
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive my-3">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-on-surface-variant">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>

      <div className="flex w-full items-center gap-4 py-6">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">or</span>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        className="w-full"
        size="lg"
      >
        <GoogleIcon className="h-5 w-5" />
        Continue with Google
      </Button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
