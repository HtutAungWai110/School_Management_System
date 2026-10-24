"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser.client";
import { cn } from "@/lib/utils.util";
import type { AnnouncementImage } from "@/types/announcement.type";
import type {
  EventAnnouncement,
  EventAnnouncementType,
} from "@/types/event-announcement.type";

const BUCKET = "event_annoncements";
const MAX_IMAGES = 10;
const MAX_LINKS = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_CONTENT = 5000;

type TypeOption = { value: EventAnnouncementType; label: string };

const TYPE_OPTIONS: TypeOption[] = [
  { value: "announcement", label: "Announcement — informational only" },
  { value: "event", label: "Event — opens registrations" },
];

type PendingImage = { id: string; kind: "new"; file: File; preview: string };
type StoredImage = { id: string; kind: "stored"; path: string; url: string; name: string };
type DraftImage = PendingImage | StoredImage;
type DraftLink = { id: string; url: string; label: string };

/** Keeps the stored object's extension honest without trusting a filename that
 *  may contain spaces, unicode, or a double extension. */
function extensionFor(file: File) {
  const fromName = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  if (/^\.[a-z0-9]{1,8}$/i.test(fromName)) return fromName.toLowerCase();

  const fromType = file.type.split("/")[1];
  return fromType ? `.${fromType.replace(/[^a-z0-9]/gi, "")}` : "";
}

function hostnameOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

/** ISO timestamp → the local `YYYY-MM-DDTHH:mm` a datetime-local input wants. */
function toDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Writes one campus-wide post, or edits one when `announcement` is supplied.
 *
 * Mirrors the batch announcement composer: new images go straight to the public
 * bucket from the browser, links are validated client and server side, and the
 * API only ever receives urls and keys. On edit, removed stored images are
 * deleted server-side after the row is saved.
 */
export function EventAnnouncementForm({
  announcement,
}: {
  announcement?: EventAnnouncement;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(announcement);

  /* Object urls are tracked in a ref so every preview is revoked exactly once:
     on removal, and on unmount. A leaked object url keeps the whole file in
     memory for the life of the tab. */
  const objectUrls = useRef<Set<string>>(new Set());

  const [type, setType] = useState<EventAnnouncementType>(
    announcement?.type ?? "announcement"
  );
  const [content, setContent] = useState(announcement?.content ?? "");
  const [startDate, setStartDate] = useState(announcement?.start_date ?? "");
  const [startTime, setStartTime] = useState(announcement?.start_time?.slice(0, 5) ?? "");
  const [deadline, setDeadline] = useState(
    toDateTimeInput(announcement?.registration_deadline ?? null)
  );
  const [images, setImages] = useState<DraftImage[]>(() =>
    (announcement?.data?.attachments?.images ?? []).map((image) => ({
      id: image.path,
      kind: "stored" as const,
      path: image.path,
      url: image.url,
      name: image.name,
    }))
  );
  const [links, setLinks] = useState<DraftLink[]>(() =>
    (announcement?.data?.attachments?.links ?? []).map((link, index) => ({
      id: `${link.url}-${index}`,
      url: link.url,
      label: link.label ?? "",
    }))
  );
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEvent = type === "event";
  const selectedType = TYPE_OPTIONS.find((option) => option.value === type) ?? null;
  const isEmpty = !content.trim() && images.length === 0 && links.length === 0;

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const problems: string[] = [];
    const accepted: PendingImage[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        problems.push(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        problems.push(`${file.name} is larger than 10 MB.`);
        continue;
      }
      if (images.length + accepted.length >= MAX_IMAGES) {
        problems.push(`You can attach up to ${MAX_IMAGES} images.`);
        break;
      }

      const preview = URL.createObjectURL(file);
      objectUrls.current.add(preview);
      accepted.push({ id: crypto.randomUUID(), kind: "new", file, preview });
    }

    if (accepted.length > 0) {
      setImages((previous) => [...previous, ...accepted]);
    }
    setError(problems.length > 0 ? problems.join(" ") : null);
  }

  function removeImage(id: string) {
    const target = images.find((image) => image.id === id);
    if (target?.kind === "new") {
      URL.revokeObjectURL(target.preview);
      objectUrls.current.delete(target.preview);
    }
    setImages((previous) => previous.filter((image) => image.id !== id));
  }

  function addLink() {
    const trimmed = linkUrl.trim();
    if (!trimmed) return;

    if (links.length >= MAX_LINKS) {
      setError(`You can attach up to ${MAX_LINKS} links.`);
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported");
    } catch {
      setError("Enter a full link starting with http:// or https://.");
      return;
    }

    setLinks((previous) => [
      ...previous,
      { id: crypto.randomUUID(), url: trimmed, label: linkLabel.trim() },
    ]);
    setLinkUrl("");
    setLinkLabel("");
    setError(null);
  }

  async function submit() {
    if (isEmpty) {
      setError("Write something or attach at least one link or image.");
      return;
    }
    if (isEvent && (!startDate || !startTime || !deadline)) {
      setError("Start date, start time, and registration deadline are required for events.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const uploadedPaths: string[] = [];

    try {
      /* Upload first, then save the urls. The reverse order would create a post
         whose images 404 if any upload failed midway. */
      const uploaded = new Map<string, AnnouncementImage>();

      for (const image of images) {
        if (image.kind !== "new") continue;

        const path = `events/${crypto.randomUUID()}${extensionFor(image.file)}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, image.file, { contentType: image.file.type, upsert: false });

        if (uploadError) throw new Error(uploadError.message);

        uploadedPaths.push(path);
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        uploaded.set(image.id, { url: data.publicUrl, path, name: image.file.name });
      }

      /* Stored images keep their grid position; new ones are not appended to
         the end, so the order the admin arranged is what gets saved. */
      const attachments = images.flatMap((image) => {
        if (image.kind === "stored") {
          return [{ url: image.url, path: image.path, name: image.name }];
        }

        const result = uploaded.get(image.id);
        return result ? [result] : [];
      });

      const endpoint = announcement
        ? `/api/event-announcements/${announcement.id}`
        : "/api/event-announcements";

      const response = await fetch(endpoint, {
        method: announcement ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content,
          ...(isEvent
            ? {
                start_date: startDate,
                start_time: startTime,
                registration_deadline: new Date(deadline).toISOString(),
              }
            : {}),
          attachments: {
            links: links.map((link) => ({ url: link.url, label: link.label || null })),
            images: attachments,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            (announcement ? "Could not save this post." : "Could not publish this post.")
        );
      }

      router.push("/admin/announcements");
      router.refresh();
    } catch (err) {
      /* Best effort: never leave files in the bucket for a post that was
         rejected, but do not let a cleanup failure mask the real error. */
      if (uploadedPaths.length > 0) {
        try {
          await supabase.storage.from(BUCKET).remove(uploadedPaths);
        } catch {
          // ignore
        }
      }

      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="overflow-hidden rounded-2xl border border-t-[3px] border-primary/10 border-t-primary bg-surface-container-lowest shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/10 px-5 py-4 sm:px-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
            {isEditing ? "Edit post" : "New post"}
          </p>
          <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
            {isEditing ? "Editing in" : "Publishing to"}{" "}
            <span className="font-[700] text-on-surface">CodePoint campus</span>
          </p>
        </div>

        <div className="border-b border-outline-variant/10 px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="post-type" className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                Post type
              </label>
              <Combobox
                items={TYPE_OPTIONS}
                value={selectedType}
                onValueChange={(next) => {
                  if (next) setType(next.value);
                }}
                disabled={saving}
              >
                <ComboboxInput
                  id="post-type"
                  placeholder="Choose a post type"
                  className="w-full"
                />
                <ComboboxContent>
                  <ComboboxEmpty>No matching type</ComboboxEmpty>
                  <ComboboxList>
                    {(option) => (
                      <ComboboxItem key={option.value} value={option}>
                        {option.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <p className="text-[11px] leading-[16px] text-on-surface-variant">
                Events open registrations and need a schedule. Announcements are
                informational only.
              </p>
            </div>

            {isEvent && (
              <div className="grid gap-3 sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="event-start-date" className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                    Start date
                  </label>
                  <Input
                    id="event-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="event-start-time" className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                    Start time
                  </label>
                  <Input
                    id="event-start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="event-deadline" className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                    Registration deadline
                  </label>
                  <Input
                    id="event-deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <label htmlFor="announcement-content" className="sr-only">
            Announcement
          </label>
          <Textarea
            id="announcement-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={MAX_CONTENT}
            disabled={saving}
            placeholder={
              isEvent
                ? "Describe the event, who it is for, and what to bring…"
                : "What does the campus need to know?"
            }
            className="min-h-[200px] resize-y rounded-xl border-outline-variant/30 bg-surface-container-low/30 px-4 py-3 text-[16px] leading-[26px]"
          />
          <div className="mt-1 flex justify-end">
            <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
              {content.length} / {MAX_CONTENT}
            </span>
          </div>
        </div>

        <div className="border-t border-outline-variant/10 px-5 py-5 sm:px-7 sm:py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Attachments</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Images */}
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[13px] font-[700] leading-[18px] text-on-surface">
                  <ImagePlus className="size-4 text-on-surface-variant" aria-hidden="true" />
                  Images
                </h3>
                <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                  {images.length}/{MAX_IMAGES}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container"
                  >
                    {/* A blob: url cannot go through next/image. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.kind === "new" ? image.preview : image.url}
                      alt={image.kind === "new" ? image.file.name : image.name}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      aria-label={`Remove ${image.kind === "new" ? image.file.name : image.name}`}
                      className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}

                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="grid aspect-square place-items-center rounded-lg border border-dashed border-outline-variant/50 text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary-fixed/20 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <Plus className="size-4" aria-hidden="true" />
                      <span className="text-[10px] font-[600]">Add</span>
                    </span>
                  </button>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-[16px] text-on-surface-variant">
                PNG, JPG, WebP or AVIF · up to 10 MB each.
              </p>
              {isEditing && (
                <p className="mt-1 text-[11px] leading-[16px] text-on-surface-variant">
                  Removing an image here deletes it from storage when you save.
                </p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={addFiles}
                className="sr-only"
                aria-label="Choose images"
              />
            </section>

            {/* Links */}
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[13px] font-[700] leading-[18px] text-on-surface">
                  <Link2 className="size-4 text-on-surface-variant" aria-hidden="true" />
                  Links
                </h3>
                <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                  {links.length}/{MAX_LINKS}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <Input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addLink();
                    }
                  }}
                  placeholder="https://example.com/resource"
                  inputMode="url"
                  aria-label="Link address"
                />
                <div className="flex gap-2">
                  <Input
                    value={linkLabel}
                    onChange={(event) => setLinkLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addLink();
                      }
                    }}
                    placeholder="Label (optional)"
                    aria-label="Link label"
                    className="min-w-0 flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addLink} disabled={!linkUrl.trim()}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add
                  </Button>
                </div>
              </div>

              {links.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {links.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-2.5 py-1.5"
                    >
                      <Link2 className="size-3.5 shrink-0 text-on-surface-variant" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        {link.label && (
                          <p className="truncate text-[12px] font-[600] leading-[16px] text-on-surface">
                            {link.label}
                          </p>
                        )}
                        <p className="truncate text-[11px] leading-[15px] text-on-surface-variant">
                          {hostnameOf(link.url)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinks((previous) => previous.filter((item) => item.id !== link.id))}
                        aria-label={`Remove ${link.label || link.url}`}
                        className="grid size-6 shrink-0 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 text-[11px] leading-[16px] text-on-surface-variant">
                Any web address. Give it a label so readers know where it goes.
              </p>
            </section>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 sm:mx-7"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-[13px] leading-[19px] text-destructive">{error}</p>
          </div>
        )}

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-outline-variant/10 bg-surface-container-low/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          <Link
            href="/admin/announcements"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-center px-4")}
          >
            Cancel
          </Link>
          <Button size="lg" className="px-4" onClick={submit} disabled={saving || isEmpty}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isEditing ? "Saving" : "Publishing"}
              </>
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Publish post"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
