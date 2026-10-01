"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Layers,
  ClipboardList,
  CheckSquare,
  Menu,
  X,
  Settings
} from "lucide-react"

import ProfileCard from "@/components/profile/profile-card.component"
import { cn } from "@/lib/utils.util"

const NAV_LINKS = [
  { href: "/student/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/student/dashboard/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/student/dashboard/batches", label: "Batches", icon: Layers },
  { href: "/student/dashboard/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/student/dashboard/attendance", label: "Attendance", icon: CheckSquare },
  { href: "/student/dashboard/settings", label: "Settings", icon: Settings }
]

export default function StudentSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close sidebar" : "Open sidebar"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-card p-2 text-foreground transition-colors hover:text-primary lg:hidden"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 cursor-default bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          // inset-y-0 left-0 is load-bearing: without an explicit inset a
          // fixed element anchors to its static position, which here is
          // inside the content wrapper's lg:pl-64 and would park it 256px in.
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5">
          <Image src="/codepoint_logo.png" alt="CodePoint Academy" width={32} height={32} className="rounded" />
          <span className="text-[18px] font-semibold leading-7 tracking-tight text-primary">CodePoint</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-[14px] font-medium transition-colors ${
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-4">
          <ProfileCard />
        </div>
      </aside>
    </>
  )
}
