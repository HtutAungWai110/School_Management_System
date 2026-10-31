import Link from "next/link";
import { CalendarDays, Check, Clock, Ticket } from "lucide-react";

import { PaginationNav } from "@/components/navigation/pagination-nav.component";
import { timeAgo } from "@/lib/format.util";
import { serverFetch } from "@/lib/server.service";
import type {
  RegisteredEvent,
  RegisteredEventPage,
} from "@/types/event-announcement.type";

const PAGE_SIZE = 10;
const DAY_MS = 86_400_000;

type Role = "student" | "teacher";

/** `start_date` is a plain date, so it is parsed as local midnight rather than
 *  UTC — otherwise an event lands a day earlier west of Greenwich. */
function parseDay(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatTime(value: string | null) {
  if (!value) return "Time to be confirmed";

  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;

  return `${display}:${minutes} ${suffix}`;
}

/** Whole days from today to the event, so a 23:00 start tonight still reads
 *  "Today" instead of rounding into tomorrow. */
function daysAway(date: Date) {
  return Math.round((date.getTime() - startOfToday().getTime()) / DAY_MS);
}

function countdown(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/**
 * One seat, drawn as a ticket: the date is the stub, the post is the body, and
 * the dashed seam with its two cut-outs is what makes it read as torn rather
 * than as another dashboard card.
 */
function EventTicket({
  event,
  upcoming,
}: {
  event: RegisteredEvent;
  upcoming: boolean;
}) {
  const start = parseDay(event.start_date);
  const registered = timeAgo(event.registration.created_at);
  const content = event.content?.trim() ?? "";
  const message = event.registration.message?.trim() ?? "";
  const days = start ? daysAway(start) : null;

  return (
    <article className="relative flex flex-col rounded-2xl bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_44px_-38px_rgba(15,23,42,0.45)] sm:flex-row">
      {/* The cut-outs sit on the seam, painted in the page colour. Hidden on
          small screens, where the seam runs horizontally. */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-[124px] hidden size-4 rounded-full bg-surface sm:block"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-2 left-[124px] hidden size-4 rounded-full bg-surface sm:block"
      />

      <div className="flex items-center gap-3 border-b border-dashed border-outline-variant/50 px-5 py-4 sm:w-[132px] sm:shrink-0 sm:flex-col sm:items-start sm:justify-center sm:gap-0 sm:border-b-0 sm:border-r sm:px-6">
        {start ? (
          <>
            <span className="font-mono text-[30px] font-semibold leading-9 tabular-nums text-primary">
              {String(start.getDate()).padStart(2, "0")}
            </span>
            <div className="sm:mt-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                {start.toLocaleDateString("en-US", { month: "short" })}
              </p>
              <p className="text-[12px] leading-4 text-on-surface-variant">
                {start.toLocaleDateString("en-US", { weekday: "long" })}
              </p>
            </div>
          </>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
            Date to be confirmed
          </p>
        )}
      </div>

      <div className="min-w-0 flex-1 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <p className="line-clamp-3 min-w-0 flex-1 text-[15px] leading-6 text-on-surface">
            {content || "Campus event"}
          </p>

          {upcoming && days !== null && (
            <span className="shrink-0 rounded-full bg-primary-fixed/60 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-on-primary-fixed-variant">
              {countdown(days)}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] leading-4 text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatTime(event.start_time)}
          </span>
          <span className="inline-flex items-center gap-1.5" title={registered.title}>
            <Check className="size-3.5" aria-hidden="true" />
            Registered {registered.label}
          </span>
        </div>

        {message && (
          <div className="mt-3 rounded-lg bg-surface-container-low px-3 py-2">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              Your note
            </p>
            <p className="mt-1 text-[13px] leading-[19px] text-on-surface">
              {message}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

function TicketGroup({
  label,
  events,
  upcoming,
}: {
  label: string;
  events: RegisteredEvent[];
  upcoming: boolean;
}) {
  if (events.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
          {label}
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
          {events.length}
        </span>
      </div>

      <ul className="flex flex-col gap-4">
        {events.map((event) => (
          <li key={event.id}>
            <EventTicket event={event} upcoming={upcoming} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The signed-in student's or teacher's registrations.
 *
 * The API orders by registration recency, but the page is read as a calendar:
 * seats still ahead come first, soonest first, and everything already held
 * follows, most recent first. Grouping happens on the page that was fetched,
 * so the pager below still counts registrations rather than events.
 */
export async function RegisteredEventsFeed({
  role,
  page,
}: {
  role: Role;
  page: number;
}) {
  const data = (await serverFetch(
    `http://localhost:3000/api/event-announcements/registered?page=${page}&limit=${PAGE_SIZE}`,
    { cache: "no-store" }
  ).then((response) =>
    response.ok ? response.json() : null
  )) as RegisteredEventPage | null;

  const events = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface-container-lowest px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-surface-container-high text-on-surface-variant">
          <Ticket className="size-5" aria-hidden="true" />
        </span>
        <p className="text-[14px] font-medium leading-5 text-on-surface">
          You haven&apos;t registered for an event yet
        </p>
        <p className="max-w-sm text-[13px] leading-5 text-on-surface-variant">
          Register from the campus wire and your seat will show up here with the
          note you left.
        </p>
        <Link
          href={`/${role}/announcements`}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[12px] font-semibold text-on-primary transition-colors hover:bg-secondary"
        >
          <CalendarDays className="size-3.5" aria-hidden="true" />
          Browse events
        </Link>
      </div>
    );
  }

  const today = startOfToday();
  const upcoming: RegisteredEvent[] = [];
  const past: RegisteredEvent[] = [];

  for (const event of events) {
    const start = parseDay(event.start_date);
    if (start && start >= today) upcoming.push(event);
    else past.push(event);
  }

  upcoming.sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  past.sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));

  return (
    <div className="flex flex-col gap-8">
      <TicketGroup label="Upcoming" events={upcoming} upcoming />
      <TicketGroup label="Past" events={past} upcoming={false} />

      <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-medium leading-4 text-on-surface-variant">
          Showing {from}–{to} of {total}
        </p>
        {totalPages > 1 && <PaginationNav page={page} totalPages={totalPages} />}
      </div>
    </div>
  );
}
