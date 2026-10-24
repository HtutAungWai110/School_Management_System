import Link from "next/link";
import { ArrowLeft, BellRing, CircleHelp } from "lucide-react";

import { EventAnnouncementForm } from "@/components/events/event-announcement-form.component";
import { NotificationBell } from "@/components/notifications/notification-bell.component";
import { createClient } from "@/lib/supabase/server.client";
import { serverFetch } from "@/lib/server.service";
import type { EventAnnouncement } from "@/types/event-announcement.type";

function Notice({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest px-6 py-16 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <BellRing className="mx-auto size-8 text-on-surface-variant" aria-hidden="true" />
      <p className="mt-4 text-[18px] font-semibold leading-6 text-on-surface">{title}</p>
      <p className="mt-1 text-[14px] leading-5 text-on-surface-variant">{description}</p>
    </div>
  );
}

export default async function EditEventAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* Editing must never open on a cached copy: the admin is about to overwrite
     it, and a stale revision would silently undo someone else's save. */
  const response = await serverFetch(
    `http://localhost:3000/api/event-announcements/${id}`,
    { cache: "no-store" }
  );
  const json = await response.json().catch(() => null);
  const announcement = (json?.data ?? null) as EventAnnouncement | null;
  const canEdit = Boolean(announcement && user && announcement.author_id === user.id);

  return (
    <div className="flex min-h-screen bg-background">
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 w-full border-b border-outline-variant/10 bg-background">
          <div className="mx-4 flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Edit post</h1>
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

          <div className="mt-6">
            {!announcement ? (
              <Notice
                title="Post not found"
                description="It may have been deleted, or the link is missing a valid id."
              />
            ) : !canEdit ? (
              <Notice
                title="Not your post"
                description="Only the admin who published a post can edit or delete it."
              />
            ) : (
              <EventAnnouncementForm key={announcement.id} announcement={announcement} />
            )}
          </div>
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
