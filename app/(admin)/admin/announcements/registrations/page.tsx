import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BellRing, CircleHelp, Users } from "lucide-react";

import { EventRegistrationLimitSelect } from "@/components/events/event-registration-limit-select.component";
import { NotificationBell } from "@/components/notifications/notification-bell.component";
import { PaginationNav } from "@/components/navigation/pagination-nav.component";
import { serverFetch } from "@/lib/server.service";
import { initialsOf } from "@/lib/format.util";
import type {
  EventAnnouncement,
  EventRegistrationPage,
} from "@/types/event-announcement.type";

const PAGE_LIMITS = [10, 20, 30];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatEventDate(value: string | null) {
  if (!value) return "—";
  /* `start_date` is a plain date, so parse it as local midnight. */
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDeadline(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRegistered(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Notice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest px-6 py-16 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <Users className="mx-auto size-8 text-on-surface-variant" aria-hidden="true" />
      <p className="mt-4 text-[18px] font-semibold leading-6 text-on-surface">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[14px] leading-5 text-on-surface-variant">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export default async function EventRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    announcement_id?: string;
    registration_id?: string;
    page?: string;
    limit?: string;
  }>;
}) {
  const { announcement_id, registration_id, page, limit } = await searchParams;

  const announcementId = announcement_id?.trim() ?? "";
  const requestedLimit = Number.parseInt(limit ?? "10", 10);
  const perPage = PAGE_LIMITS.includes(requestedLimit) ? requestedLimit : 10;
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  /* Notification links arrive filtered to one registration. A malformed value
     is ignored rather than failing the page, since the whole list is still a
     useful fallback. */
  const requestedRegistrationId = registration_id?.trim() ?? "";
  const focusedRegistrationId = UUID.test(requestedRegistrationId)
    ? requestedRegistrationId
    : "";

  let event: EventAnnouncement | null = null;
  let registrations: EventRegistrationPage | null = null;

  if (announcementId) {
    const registrationsQuery = [
      `page=${currentPage}`,
      `limit=${perPage}`,
      focusedRegistrationId
        ? `registration_id=${encodeURIComponent(focusedRegistrationId)}`
        : "",
    ]
      .filter(Boolean)
      .join("&");

    const [eventResponse, registrationsResponse] = await Promise.all([
      serverFetch(
        `http://localhost:3000/api/event-announcements/${announcementId}`,
        { cache: "no-store" }
      ),
      serverFetch(
        `http://localhost:3000/api/event-announcements/${announcementId}/registrations?${registrationsQuery}`,
        { cache: "no-store" }
      ),
    ]);

    if (eventResponse.ok) {
      const payload = (await eventResponse.json().catch(() => null)) as {
        data?: EventAnnouncement;
      } | null;
      event = payload?.data ?? null;
    }

    if (registrationsResponse.ok) {
      registrations = (await registrationsResponse
        .json()
        .catch(() => null)) as EventRegistrationPage | null;
    }
  }

  const rows = registrations?.data ?? [];
  const total = registrations?.total ?? 0;
  const totalPages = registrations?.totalPages ?? 1;
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 border-b border-outline-variant/10 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/admin/announcements"
              aria-label="Back to announcements"
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
                Registrations
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:py-10">
        {!announcementId ? (
          <Notice
            title="No event selected"
            description="Open an event from the campus wire and choose View registrations."
            action={
              <Link
                href="/admin/announcements"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-secondary"
              >
                Back to announcements
              </Link>
            }
          />
        ) : !event ? (
          <Notice
            title="Event not found"
            description="It may have been deleted, or the link is missing a valid id."
          />
        ) : !registrations ? (
          <Notice
            title="Could not load registrations"
            description="The list may be temporarily unavailable. Try refreshing the page."
          />
        ) : (
          <>
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                Event
              </p>
              <h2 className="mt-1.5 text-[18px] font-bold leading-[26px] text-on-surface">
                {event.content?.trim() || "Untitled event"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-on-surface-variant">
                <span>Date · {formatEventDate(event.start_date)}</span>
                <span>Starts · {event.start_time?.slice(0, 5) ?? "—"}</span>
                <span>Registration closes · {formatDeadline(event.registration_deadline)}</span>
              </div>
            </section>

            <div className="mb-3 mt-7 flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-baseline gap-2">
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Registrations
                </h3>
                <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                  {total} {total === 1 ? "person" : "people"}
                </span>
                {focusedRegistrationId && (
                  <Link
                    href={`/admin/announcements/registrations?announcement_id=${announcementId}`}
                    className="text-[11px] font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                  >
                    View all
                  </Link>
                )}
              </div>
              <EventRegistrationLimitSelect limit={perPage} />
            </div>

            {rows.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-lowest px-6 py-14 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-container-high text-on-surface-variant">
                  <Users className="size-5" aria-hidden="true" />
                </span>
                <h4 className="mt-4 text-[16px] font-bold leading-6 text-on-surface">
                  No registrations yet
                </h4>
                <p className="mx-auto mt-1 max-w-sm text-[13px] leading-5 text-on-surface-variant">
                  Students and teachers who register for this event will appear
                  here, newest first.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {rows.map((registration) => {
                  const person = registration.profile;
                  const isFocused = registration.id === focusedRegistrationId;

                  return (
                    <li
                      key={registration.id}
                      className={`flex gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-5 ${
                        isFocused ? "ring-2 ring-primary/30" : ""
                      }`}
                    >
                      {person?.avatar_url ? (
                        <Image
                          src={person.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="size-10 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                        />
                      ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-[12px] font-bold text-on-primary-fixed-variant">
                          {initialsOf(person?.full_name)}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="truncate text-[14px] font-bold leading-[18px] text-on-surface">
                            {person?.full_name ?? "Unknown member"}
                          </p>
                          <time
                            dateTime={registration.created_at}
                            className="font-mono text-[11px] tabular-nums text-on-surface-variant"
                          >
                            {formatRegistered(registration.created_at)}
                          </time>
                        </div>

                        {registration.message ? (
                          <p className="mt-1.5 whitespace-pre-line text-[13px] leading-[19px] text-on-surface-variant">
                            {registration.message}
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[12px] italic leading-[18px] text-on-surface-variant/80">
                            No additional message.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

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
          </>
        )}
      </main>

      <footer className="mt-10 border-t border-outline-variant/10 bg-surface-container-lowest">
        <div className="mx-auto flex w-full max-w-[960px] flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row lg:px-8">
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
