"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { X, Fingerprint } from "lucide-react"
import { cn } from "@/lib/utils.util"
import type { Profile } from "@/types/profile.type"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatBadgeId(id: string) {
  return id.replace(/-/g, "").slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, "$1-")
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDateInput(value: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function idBars(id: string) {
  return id
    .replace(/-/g, "")
    .slice(0, 26)
    .split("")
    .map((ch, i) => ({
      key: i,
      width: 2 + (parseInt(ch, 16) % 3),
      tall: i % 4 < 2,
    }))
}

function Field({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  const empty = value.trim() === ""
  return (
    <div className={cn("min-w-0 border-t border-outline-variant/25 pt-3 pb-4", full && "col-span-2")}>
      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">{label}</p>
      <p
        className={cn(
          "mt-1 break-words text-[14px] font-[600] leading-[20px] text-on-surface",
          empty && "text-on-surface-variant/70"
        )}
      >
        {empty ? "—" : value}
      </p>
    </div>
  )
}

interface ProfileViewPanelProps {
  profile: Profile
  onClose: () => void
}

export function ProfileViewPanel({ profile, onClose }: ProfileViewPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1)

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${profile.full_name} profile`}>
      <button
        type="button"
        aria-label="Close profile"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-300 motion-reduce:animate-none"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-surface-container-lowest shadow-2xl animate-in slide-in-from-right duration-300 ease-out motion-reduce:animate-none">
        <header className="relative bg-primary-container px-8 pb-7 pt-6">
          <button
            ref={closeRef}
            type="button"
            aria-label="Close profile"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center justify-between pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">CodePoint Academy</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">{roleLabel} ID</p>
          </div>

          <div className="mt-6 flex items-center gap-5">
            {profile.avatar_url ? (
              <Image
                className="size-16 rounded-full object-cover ring-2 ring-white/25"
                src={profile.avatar_url}
                alt={profile.full_name}
                width={64}
                height={64}
                unoptimized
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-[800] text-white ring-2 ring-white/25">
                {getInitials(profile.full_name)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-[800] leading-[28px] text-white">{profile.full_name}</h2>
              <p className="mt-1 truncate text-[13px] leading-[18px] text-white/70">{profile.email}</p>
            </div>
          </div>

          <div className="mt-7 flex items-end justify-between gap-6 border-t border-white/15 pt-5">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/60">ID No.</p>
              <p className="mt-1.5 truncate text-[15px] font-[700] tabular-nums tracking-[0.18em] text-white">
                {formatBadgeId(profile.id)}
              </p>
            </div>
            <div className="flex shrink-0 items-end gap-[2px]" aria-hidden="true">
              {idBars(profile.id).map((bar) => (
                <span
                  key={bar.key}
                  className="bg-white/85"
                  style={{ width: bar.width, height: bar.tall ? 30 : 22 }}
                />
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Details</p>
          <div className="mt-4 grid grid-cols-2 gap-x-6">
            <Field label="Email" value={profile.email} />
            <Field label="Phone" value={profile.phone} />
            <Field label="Date of birth" value={formatDateInput(profile.date_of_birth)} />
            <Field label="Role" value={roleLabel} />
            <Field label="Address" value={profile.address} full />
          </div>

          <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Identifier</p>
          <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/40 p-4">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Fingerprint className="size-4" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">Roster ID</p>
            </div>
            <p className="mt-2 break-all text-[13px] font-[600] leading-[20px] text-on-surface-variant">{profile.id}</p>
            <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Enrolled</p>
            <p className="mt-1 text-[13px] font-[600] leading-[20px] text-on-surface">{formatDate(profile.created_at)}</p>
          </div>
        </div>

        <footer className="border-t border-outline-variant/20 px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-[14px] font-[700] leading-[16px] tracking-[0.05em] text-on-primary transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Close
          </button>
        </footer>
      </aside>
    </div>
  )
}
