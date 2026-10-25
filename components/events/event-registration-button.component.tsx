"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProfileStore } from "@/components/profile/profile.state";
import { Role } from "@/types/profile.type";

const MAX_MESSAGE = 1000;

/**
 * The register control on an event post.
 *
 * Only students and teachers see it: the profile store tells us who is
 * reading, and an admin is not the audience for a seat. Whether a seat is
 * already taken is probed once on mount, because the feed row only carries the
 * aggregate count. The server re-checks the deadline and the unique key, so
 * this component never has to be trusted for correctness, only for feel.
 */
export function EventRegistrationButton({
  announcementId,
  registrationDeadline,
}: {
  announcementId: string;
  registrationDeadline: string | null;
}) {
  const router = useRouter();
  const { profile, hydrated } = useProfileStore();

  const [registered, setRegistered] = useState(false);
  const [closed, setClosed] = useState(false);
  const [probed, setProbed] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRegister =
    hydrated && (profile.role === Role.STUDENT || profile.role === Role.TEACHER);

  const syncRegistration = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/event-announcements/${announcementId}/is_registered`,
        { credentials: "include", cache: "no-store" }
      );

      if (!response.ok) return;

      const body = (await response.json().catch(() => null)) as {
        registered?: unknown;
      } | null;

      if (typeof body?.registered === "boolean") {
        setRegistered(body.registered);
      }
    } catch {
      /* A failed probe leaves the register button in place. The server will
         refuse a duplicate on submit, so the worst case is one extra click. */
    } finally {
      /* Read the clock after the await, never during render: the deadline is
         evaluated on the client, after hydration, so server markup and client
         markup agree. */
      setClosed(
        Boolean(registrationDeadline) &&
          new Date(registrationDeadline as string).getTime() < Date.now()
      );
      setProbed(true);
    }
  }, [announcementId, registrationDeadline]);

  useEffect(() => {
    if (!canRegister) return;

    /* Nothing is set synchronously here; the probe writes state only after its
       response resolves. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncRegistration();
  }, [canRegister, syncRegistration]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, submitting]);

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/event-announcements/${announcementId}/register`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message.trim() || null }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not register for this event.");
      }

      setRegistered(true);
      setOpen(false);
      setMessage("");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!canRegister || !probed) return null;

  if (registered) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/50 px-2 py-0.5 text-[11px] font-semibold text-on-primary-fixed-variant">
        <Check className="size-3" aria-hidden="true" />
        Registered
      </span>
    );
  }

  if (closed) {
    return (
      <span className="text-[11px] font-medium text-on-surface-variant">
        Registration closed
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="h-7 px-2.5 text-[11px] font-semibold"
      >
        Register
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Register for this event"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => {
              if (!submitting) setOpen(false);
            }}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-300 motion-reduce:animate-none"
          />
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">
            <div className="px-6 pb-5 pt-6">
              <h2 className="text-[18px] font-[800] leading-[26px] text-on-surface">
                Register for this event
              </h2>
              <p className="mt-1.5 text-[13px] leading-[19px] text-on-surface-variant">
                Your seat will be reserved under your name.
              </p>

              <label
                htmlFor="registration-message"
                className="mt-5 block text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant"
              >
                Write additional message
              </label>
              <Textarea
                id="registration-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={MAX_MESSAGE}
                disabled={submitting}
                autoFocus
                placeholder="Anything the organiser should know? (optional)"
                className="mt-2 min-h-[110px] resize-y"
              />
              <p className="mt-1 text-right font-mono text-[11px] tabular-nums text-on-surface-variant">
                {message.length} / {MAX_MESSAGE}
              </p>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-destructive"
                    aria-hidden="true"
                  />
                  <p className="text-[13px] leading-[19px] text-destructive">{error}</p>
                </div>
              )}
            </div>

            <footer className="flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void submit()} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Submitting
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
