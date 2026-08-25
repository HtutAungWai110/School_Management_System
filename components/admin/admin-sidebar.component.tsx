'use client'

import { useState } from "react"
import Image from "next/image"
import ProfileCard from "@/components/profile/profile-card.component"
import ThemeToggle from "@/components/theme/theme-toggle.component"
import { LayoutDashboard, GraduationCap, User, Users, Calendar, Settings, Book, BookOpenCheck, Layers, Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false)

  const navLinks = [
    { href: "/admin/dashboard/overview", label: "Overview", icon: LayoutDashboard, active: path === "/admin/dashboard/overview" },
    { href: "/admin/dashboard/students", label: "Students", icon: GraduationCap, active: path === "/admin/dashboard/students" },
    { href: "/admin/dashboard/teachers", label: "Teachers", icon: User, active: path === "/admin/dashboard/teachers" },
    { href: "/admin/dashboard/modules", label: "Modules", icon: Book, active: path === "/admin/dashboard/modules"  },
    { href: "/admin/dashboard/levels", label: "Levels", icon: Layers, active: path === "/admin/dashboard/levels" },
    { href: "/admin/dashboard/enrollments", label: "Enrollments", icon: BookOpenCheck, active: path === "/admin/dashboard/enrollments" },
    { href: "/admin/dashboard/batches", label: "Batches", icon: Users, active: path === "/admin/dashboard/batches" },
    { href: "/admin/dashboard/timetable", label: "Timetable", icon: Calendar, active: path === "/admin/dashboard/timetable" },
    { href: "/admin/dashboard/settings", label: "Settings", icon: Settings, active: path === "/admin/dashboard/settings"  },
  ]
  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close sidebar" : "Open sidebar"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="fixed top-4 left-4 z-50 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] text-on-surface hover:text-primary transition-colors lg:hidden"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 animate-in fade-in duration-200 lg:hidden cursor-default"
        />
      )}

      <aside
        className={`w-64 bg-surface-container-lowest border-r border-outline-variant/10 flex flex-col fixed h-full z-40 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="px-6 py-10 flex items-center gap-3">
          <Image
            src="/codepoint_logo.png"
            alt="CodePoint Academy"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="text-[20px] font-[600] leading-[28px] tracking-tight text-primary">CodePoint</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navLinks.map((link, index) => {
            const Icon = link.icon
            return (
              <Link href={link.href}
                key={index}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded text-[14px] font-[600] leading-[16px] tracking-[0.05em] transition-all duration-200 ${
                  link.active
                    ? "text-primary font-bold bg-secondary-container/30 border-r-4 border-primary"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                }`}
              >
                <Icon className={`w-5 h-5 ${link.active ? "" : "text-on-surface-variant"}`} />
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-6 border-t border-outline-variant/10">
          <div className="flex items-center justify-between">
            <ProfileCard />
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  )
}
