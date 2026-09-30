"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { UserRound, Palette, ChevronRight, LogOut, ShieldCheck } from "lucide-react"

import { signOut } from "@/app/auth/auth.action"
import { useProfileStore } from "@/components/profile/profile.state"
import SettingsFieldRow from "@/components/profile/settings-field-row.component"
import ThemePreference from "@/components/profile/theme-preference.component"
import type { Profile } from "@/types/profile.type"
import { cn } from "@/lib/utils.util"

type Tab = "account" | "theme"

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/** The column is a date, but it may arrive as a full ISO timestamp. */
function toDateInput(value: string) {
  if (!value) return ""
  return value.slice(0, 10)
}

function formatDate(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatMemberSince(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

export default function SettingsView({
  profile,
  withSidebar = false,
}: {
  profile: Profile
  /** The admin and teacher layouts render a fixed w-64 sidebar and put
   *  no offset on their children, so those pages have to clear it. The
   *  student portal has a top header instead and must not be inset. */
  withSidebar?: boolean
}) {
  const [tab, setTab] = useState<Tab>("account")
  const router = useRouter()
  const setProfile = useProfileStore((state) => state.setProfile)

  const role = profile.role?.toLowerCase() ?? ""

  /** One field per request — ProfileService.patch only accepts these
   *  three, and a narrow payload can't overwrite anything else. */
  async function saveField(field: "phone" | "address" | "date_of_birth", value: string) {
    const res = await fetch(`/api/profile/${profile.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Could not save your change.")
    }

    const result = await res.json()
    const updated = result.profileData as Profile
    setProfile(updated)
    router.refresh()
  }

  return (
    <main className={cn(withSidebar && "lg:ml-64")}>
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-12">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[13px] text-on-surface-variant">
        <span>Preferences</span>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">Settings</span>
      </nav>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5 md:px-8">
          <h1 className="text-[24px] font-bold leading-8 tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-[14px] text-on-surface-variant">
            Your CodePoint Academy profile, contact details, and appearance.
          </p>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Section rail */}
          <aside className="shrink-0 border-b border-border bg-surface-container-low/60 p-4 md:w-64 md:border-b-0 md:border-r lg:w-72">
            <nav aria-label="Settings sections" className="space-y-1">
              {(
                [
                  { key: "account" as const, label: "Account", Icon: UserRound },
                  { key: "theme" as const, label: "Theme", Icon: Palette },
                ]
              ).map(({ key, label, Icon }) => {
                const active = tab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-left text-[14px] font-medium transition-colors",
                      active
                        ? "bg-primary/50 text-on-primary-container"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="size-4" />
                      {label}
                    </span>

                  </button>
                )
              })}
            </nav>
          </aside>

          <section className="flex-1 p-6 md:p-8">
            <div className="max-w-2xl">
            {tab === "theme" ? (
              <ThemePreference />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-container text-primary">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-[18px] font-bold">{getInitials(profile.full_name ?? "")}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[18px] font-semibold leading-6 text-foreground">
                      {profile.full_name}
                    </h2>
                    <p className="truncate text-[14px] text-on-surface-variant">
                      {ROLE_LABEL[role] ?? role} · CodePoint Academy
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  <SettingsFieldRow label="Full name" value={profile.full_name ?? ""} hint="Managed by your academy administrator." />
                  <SettingsFieldRow
                    label="Email"
                    value={profile.email ?? ""}
                    hint="Used to sign in. Contact an administrator to change it."
                  />
                  <SettingsFieldRow
                    label="Phone"
                    value={profile.phone ?? ""}
                    onSave={(value) => saveField("phone", value)}
                    placeholder="+44 7700 900123"
                  />
                  <SettingsFieldRow
                    label="Address"
                    value={profile.address ?? ""}
                    type="textarea"
                    onSave={(value) => saveField("address", value)}
                    placeholder="Street, city, postcode"
                  />
                  <SettingsFieldRow
                    label="Date of birth"
                    value={toDateInput(profile.date_of_birth ?? "")}
                    displayValue={formatDate(profile.date_of_birth ?? "")}
                    type="date"
                    onSave={(value) => saveField("date_of_birth", value)}
                  />
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-container-high text-primary">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-foreground">Account access</p>
                      <p className="mt-0.5 text-[13px] text-on-surface-variant">
                        You can only edit your own profile. Role and account status are set by an
                        administrator.
                      </p>
                    </div>
                  </div>
                  <dl className="shrink-0 text-left sm:text-right">
                    <div className="flex gap-2 sm:justify-end">
                      <dt className="text-[12px] text-on-surface-variant">Member since</dt>
                      <dd className="text-[12px] font-medium text-foreground">
                        {formatMemberSince(profile.created_at)}
                      </dd>
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <dt className="text-[12px] text-on-surface-variant">Reference</dt>
                      <dd className="font-mono text-[12px] text-foreground">
                        {profile.id.slice(0, 8).toUpperCase()}
                      </dd>
                    </div>
                  </dl>
                </div>

                <form action={signOut}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium text-error transition-colors hover:bg-error/10"
                  >
                    <LogOut className="size-4" />
                    Log out
                  </button>
                  <p className="mt-1 pl-1 text-[12px] text-on-surface-variant">
                    Ends this session and returns you to the sign-in page.
                  </p>
                </form>
              </div>
            )}
            </div>
          </section>
        </div>
      </div>
    </div>
    </main>
  )
}
