"use client"

import Image from "next/image"
import Link from "next/link"
import { LayoutDashboard } from "lucide-react"

import ProfileCard from "@/components/profile/profile-card.component"
import { cn } from "@/lib/utils.util"

export type StudentPortalNav = "home" | "levels"

const NAV_LINKS = [
  { label: "Portal Home", href: "/student", key: "home" },
  { label: "Levels", href: "/student/levels", key: "levels" },
  { label: "Academics", href: "#", key: "academics" },
  { label: "Resources", href: "#", key: "resources" },
] as const

export default function StudentPortalHeader({ active }: { active: StudentPortalNav }) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-[1440px] mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/student/dashboard/overview"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-container text-on-primary text-[14px] font-[600] leading-[16px] tracking-[0.05em] hover:bg-secondary transition-colors"
          >
            <LayoutDashboard className="w-[18px] h-[18px]" />
            <span>Go to Dashboard</span>
          </Link>

          <ProfileCard />
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const isActive = link.key === active
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "text-[14px] font-[600] leading-[16px] tracking-[0.05em] transition-colors",
                    isActive
                      ? "text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 pl-4">
            <Image
              src="/codepoint_logo.png"
              alt="CodePoint Academy"
              width={28}
              height={28}
              className="w-7 h-7 rounded object-contain"
            />
            <span className="text-[20px] font-[600] leading-[28px] tracking-tight text-on-surface">
              CodePoint Academy
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}