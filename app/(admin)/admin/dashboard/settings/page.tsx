import Image from "next/image"
import { Bell, CircleHelp, LogOut } from "lucide-react"

import { createClient } from "@/lib/supabase/server.client"
import { signOut } from "@/app/auth/auth.action"
import { Button } from "@/components/ui/button.component"
import { cn } from "@/lib/utils.util"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatBadgeId(id: string) {
  return id.replace(/-/g, "").slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, "$1-")
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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

function Field({ label, value, full = false }: { label: string; value?: string | null; full?: boolean }) {
  const empty = value?.trim() === ""
  return (
    <div className={cn("min-w-0 border-t border-outline-variant/25 pt-3 pb-4", full && "col-span-2")}>
      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">{label}</p>
      <p className={cn(
        "mt-1 break-words text-[14px] font-[600] leading-[20px] text-on-surface",
        empty && "text-on-surface-variant/70"
      )}>
        {empty ? "—" : value}
      </p>
    </div>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null }

  const email = profile?.email ?? user?.email ?? ""
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ""

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Settings</h1>
            <div className="flex items-center gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="hidden sm:inline text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <div className="relative">
                <Bell className="w-5 h-5 text-on-surface-variant cursor-pointer" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 md:px-12 py-10 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {profile && (
              <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                <div className="px-6 md:px-8 pt-8 pb-7 flex items-start gap-5">
                  <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">{getInitials(profile.full_name)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Account record</p>
                    <h2 className="mt-2 truncate text-[24px] font-[700] leading-[32px] text-primary">{profile.full_name}</h2>
                    <p className="mt-1 truncate text-[14px] leading-[20px] text-on-surface-variant">{profile.email}</p>
                  </div>
                  <span className="ml-auto shrink-0 self-start mt-1 px-2.5 py-0.5 rounded-full bg-secondary-container/30 text-secondary border border-secondary-container text-[12px] font-[500] leading-[16px] capitalize">
                    {profile.role}
                  </span>
                </div>

                <div className="bg-primary-container px-6 md:px-8 py-6">
                  <div className="flex items-end justify-between gap-6">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/60">ID No.</p>
                      <p className="mt-1.5 truncate text-[18px] font-[700] tabular-nums tracking-[0.18em] text-white">
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
                </div>

                <div className="px-6 md:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <Field label="Phone" value={profile.phone} />
                  <Field label="Date of birth" value={profile.date_of_birth} />
                  <Field label="Enrolled" value={formatDate(profile.created_at)} />
                  <Field label="Address" value={profile.address} full />
                </div>
              </div>
            )}

            <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 md:p-8 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] self-start">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Session</p>

              <div className="mt-5 flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-[14px] font-[600] leading-[16px] text-on-surface">Signed in</span>
              </div>
              <p className="mt-2 break-words text-[13px] leading-[18px] text-on-surface-variant">{email}</p>
              {roleLabel && (
                <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant/70 capitalize">Role: {roleLabel}</p>
              )}

              <div className="my-6 border-t border-outline-variant/20" />

              <form action={signOut}>
                <Button variant="destructive" size="lg" type="submit" className="w-full">
                  <LogOut className="size-4" />
                  Log out
                </Button>
              </form>
              <p className="mt-3 text-center text-[12px] leading-[16px] text-on-surface-variant">
                Ends this session and returns you to the sign-in page.
              </p>
            </div>
          </div>
        </div>

        <footer className="bg-surface-container-lowest border-t border-outline-variant/10 mt-10">
          <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-6 w-full max-w-[1440px] mx-auto">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface">CodePoint Academy</span>
              <span className="text-[12px] font-[500] leading-[16px] text-secondary">© 2024 ScholarlyAdmin School Management System</span>
            </div>
            <div className="flex gap-6">
              {["Help Center", "Privacy Policy", "Terms of Service"].map((link) => (
                <a key={link} href="#" className="text-[12px] font-[500] leading-[16px] text-on-surface-variant hover:text-primary transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
