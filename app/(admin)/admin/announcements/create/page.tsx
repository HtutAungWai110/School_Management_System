import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";

import { EventAnnouncementForm } from "@/components/events/event-announcement-form.component";
import { NotificationBell } from "@/components/notifications/notification-bell.component";

export default function CreateEventAnnouncementPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 w-full border-b border-outline-variant/10 bg-background">
          <div className="mx-4 flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">New post</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button className="flex items-center gap-1 text-on-surface-variant transition-colors duration-200 hover:text-primary">
                <CircleHelp className="h-5 w-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">
                  Help
                </span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <Link
            href="/admin/announcements"
            className="inline-flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface-variant transition-colors duration-200 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to announcements
          </Link>

          <p className="mt-4 mb-6 text-[14px] leading-5 text-on-surface-variant">
            Publish an announcement to the whole campus, or open registrations
            for an event. Events appear in the portal with a registration
            deadline.
          </p>

          <EventAnnouncementForm />
        </div>

        <footer className="mt-10 border-t border-outline-variant/10 bg-surface-container-lowest">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row lg:px-12">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 md:mb-0">
              <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface">
                CodePoint Academy
              </span>
              <span className="text-[12px] font-[500] leading-[16px] text-secondary">
                © 2024 ScholarlyAdmin School Management System
              </span>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {["Help Center", "Privacy Policy", "Terms of Service"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-[12px] font-[500] leading-[16px] text-on-surface-variant transition-colors hover:text-primary"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
