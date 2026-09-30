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
] as const

export default function StudentPortalHeader({ active }: { active: StudentPortalNav }) {
  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-border bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <Link
            href="/student/dashboard/overview"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <LayoutDashboard className="size-[18px]" />
            <span>Go to Dashboard</span>
          </Link>

          <ProfileCard />
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = link.key === active
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "text-[14px] font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-on-surface-variant hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 border-l border-border pl-6">
            <Image
              src="/codepoint_logo.png"
              alt="CodePoint Academy"
              width={28}
              height={28}
              className="size-7 rounded object-contain"
            />
            <span className="hidden whitespace-nowrap text-[18px] font-semibold leading-7 tracking-tight text-foreground sm:inline">
              CodePoint Academy
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
