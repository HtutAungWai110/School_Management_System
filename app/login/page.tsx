'use client';

import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="fixed top-0 z-50 w-full bg-surface">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 md:px-12 py-5">
          <span className="text-xl font-semibold tracking-tight text-primary">
            CodePoint Academy
          </span>
          <div className="hidden items-center gap-6 md:flex">
            <span className="text-sm text-on-surface-variant">Need assistance?</span>
            <a
              href="#"
              className="border-b-2 border-primary pb-1 text-sm font-semibold text-primary transition-transform duration-150 active:scale-95"
            >
              Help
            </a>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 md:px-12 pt-28 pb-12">
        <div className="w-full max-w-sm rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
          <AuthForm />
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
