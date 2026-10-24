import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  BellRing,
  CircleHelp,
  Plus,
} from "lucide-react";

import { EventAnnouncementsList } from "@/components/events/event-announcements-list.component";
import { NotificationBell } from "@/components/notifications/notification-bell.component";
import { PaginationNav } from "@/components/navigation/pagination-nav.component";
import { createClient } from "@/lib/supabase/server.client";
import { serverFetch } from "@/lib/server.service";
import { initialsOf } from "@/lib/format.util";
import type { EventAnnouncementPage } from "@/types/event-announcement.type";

const PAGE_SIZE = 10;

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user?.id)
    .single();

  const data = (await serverFetch(
    `http://localhost:3000/api/event-announcements?page=${currentPage}&limit=${PAGE_SIZE}`,
    { cache: "no-store" }
  ).then((response) => response.json())) as EventAnnouncementPage | null;

  const announcements = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 border-b border-outline-variant/10 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/admin"
              aria-label="Back to portal home"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-outline-variant/20 text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ArrowLeft className="size-[18px]" aria-hidden="true" />
            </Link>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-on-primary">
              <BellRing className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase leading-3 tracking-[0.22em] text-on-surface-variant">
                Campus wire
              </p>
              <h1 className="truncate text-[18px] font-bold leading-6 text-on-surface">
                Announcements
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary sm:inline-flex"
            >
              <CircleHelp className="size-5" />
              <span className="text-[13px] font-semibold">Help</span>
            </button>
            <NotificationBell />
            <Link
              href="/admin/announcements/create"
              className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-secondary"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">New post</span>
              <span className="sr-only sm:hidden">New post</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-4 py-6 sm:px-6 lg:py-10">
        <div className="min-w-0">
          {/* Composer affordance: reads like the first post in the stream. */}
          <div className="rounded-2xl bg-surface-container-lowest p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-4">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-[12px] font-bold text-on-primary-fixed-variant">
                  {initialsOf(profile?.full_name)}
                </span>
              )}
              <Link
                href="/admin/announcements/create"
                className="min-w-0 flex-1 truncate rounded-full bg-surface-container-low px-4 py-3 text-[14px] text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                Share an update with campus…
              </Link>
            </div>
          </div>

          <div className="mb-3 mt-7 flex items-baseline justify-between px-1">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
              Latest
            </h2>
            <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
              {total} {total === 1 ? "post" : "posts"}
            </span>
          </div>

          <EventAnnouncementsList
            announcements={announcements}
            emptyMessage="The wire is quiet. Share the first update with campus."
          />

          {total > 0 && (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] font-medium leading-4 text-on-surface-variant">
                Showing {from}–{to} of {total}
              </p>
              {totalPages > 1 && (
                <PaginationNav page={currentPage} totalPages={totalPages} />
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="mt-10 border-t border-outline-variant/10 bg-surface-container-lowest">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row lg:px-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[13px] font-semibold text-on-surface">
              CodePoint Academy
            </span>
            <span className="text-[12px] text-secondary">
              © 2024 ScholarlyAdmin School Management System
            </span>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {["Help Center", "Privacy Policy", "Terms of Service"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-[12px] text-on-surface-variant transition-colors hover:text-primary"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
