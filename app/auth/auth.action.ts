'use server';

import { createClient } from '@/lib/supabase/server.client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  sanitizeText,
  isSafeEmail,
  isSafeName,
  isSafePassword,
} from '@/lib/validation/text.validation';

export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = sanitizeText(formData.get('email') as string);
  const password = sanitizeText(formData.get('password') as string);

  if (!isSafeEmail(email) || !isSafePassword(password)) {
    redirect(`/login?error=${encodeURIComponent('Invalid email or password.')}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = sanitizeText(formData.get('email') as string);
  const password = sanitizeText(formData.get('password') as string);
  const fullName = sanitizeText(formData.get('fullName') as string);

  if (!isSafeEmail(email)) {
    redirect(`/login?error=${encodeURIComponent('Please enter a valid email address.')}`);
  }

  if (!isSafeName(fullName)) {
    redirect(`/login?error=${encodeURIComponent('Please enter a valid full name.')}`);
  }

  if (!isSafePassword(password)) {
    redirect(`/login?error=${encodeURIComponent('Please enter a valid password.')}`);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/login?message=Check your email to confirm registration');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
