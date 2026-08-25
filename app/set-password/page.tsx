'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button.component';
import { Input } from '@/components/ui/input.component';
import { createClient } from '@/lib/supabase/browser.client';

type FormValues = {
  password: string;
  confirmPassword: string;
};

export default function SetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const watched = useWatch({ control });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setCheckingSession(false);
    });
  }, [router]);

  const password = watched.password ?? '';

  async function onSubmit(data: FormValues) {
    setSubmitError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.replace('/');
    }, 1200);
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <p className="text-sm text-on-surface-variant">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="fixed top-0 z-50 w-full bg-surface">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 md:px-12 py-5">
          <span className="text-xl font-semibold tracking-tight text-primary">
            CodePoint Academy
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 md:px-12 pt-28 pb-12">
        <div className="w-full max-w-sm rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
          {success ? (
            <div className="text-center">
              <ShieldCheck className="mx-auto size-10 text-green-600" />
              <h1 className="mt-4 text-[20px] font-[700] leading-[28px] text-on-surface">
                Password updated
              </h1>
              <p className="mt-2 text-[14px] leading-[20px] text-on-surface-variant">
                Your new password is set. Redirecting you to the dashboard…
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-[22px] font-[700] leading-[28px] text-on-surface">
                  Set a new password
                </h1>
                <p className="mt-1.5 text-[14px] leading-[20px] text-on-surface-variant">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="password">
                    New password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      aria-invalid={!!errors.password}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters',
                        },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((show) => !show)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive my-3">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="confirmPassword">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      aria-invalid={!!errors.confirmPassword}
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) =>
                          value === password || 'Passwords do not match',
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((show) => !show)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive my-3">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {submitError && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                    {submitError}
                  </p>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <Lock className="size-4" />
                  {isSubmitting ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>

      <div className="fixed top-0 right-0 -z-10 opacity-10 pointer-events-none">
        <svg width="420" height="420" viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="210" cy="210" r="190" stroke="currentColor" strokeWidth="1" className="text-outline" />
          <circle cx="210" cy="210" r="125" stroke="currentColor" strokeWidth="1" strokeDasharray="8 8" className="text-outline" />
          <circle cx="210" cy="210" r="60" stroke="currentColor" strokeWidth="2" className="text-outline" />
          <circle cx="210" cy="210" r="3" fill="currentColor" className="text-primary" />
        </svg>
      </div>
    </div>
  );
}
