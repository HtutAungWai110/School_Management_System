"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { createClient } from "@/lib/supabase/browser.client";

export default function LinkExpiredPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSending(true);

    try {
      // Triggers a password reset link which grants access to /set-password
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        setError(error.message);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
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
          <div className="mb-6">
            <h1 className="text-[22px] font-[700] leading-[28px] text-on-surface">
              Link expired
            </h1>
            <p className="mt-1.5 text-[14px] leading-[20px] text-on-surface-variant">
              This link has already been used or has expired. Enter your email below to receive a
              new link to set up your account.
            </p>
          </div>

          {sent ? (
            <div className="rounded-lg border border-green-200 bg-green-100 px-3 py-2.5 text-[13px] leading-[18px] text-green-800">
              A new link has been sent to your email!
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={isSending} className="w-full">
                <Mail className="size-4" />
                {isSending ? "Sending…" : "Send new link"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
