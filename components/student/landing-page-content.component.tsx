"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarPlus,
  Clock,
  Download,
  DoorOpen,
  ExternalLink,
  Lock,
  MapPin,
  Pin,
  ShieldCheck,
} from "lucide-react"

import StudentPortalFooter from "@/components/student/student-portal-footer.component"
import StudentPortalHeader from "@/components/student/student-portal-header.component"
import { cn } from "@/lib/utils.util"

const FILTERS = ["All", "Academic", "Exam Schedule", "Campus Events", "System Alerts"] as const
type Filter = (typeof FILTERS)[number]

type FeedItem = {
  id: string
  category: Exclude<Filter, "All">
  badge: string
  meta: string
  title: string
  body: string
  image: string
  imageAlt: string
  footer: {
    kind: "avatar" | "icon"
    value?: string
    label: string
  }
  action: { label: string; icon: typeof ArrowRight; href?: string }
}

const FEED: FeedItem[] = [
  {
    id: "cloud-workshop",
    category: "Campus Events",
    badge: "Campus Event • Hands-on Tech",
    meta: "Friday, 2:00 PM - 5:30 PM",
    title: "Cloud Infrastructure Workshop (AWS & Kubernetes)",
    body: "Join certified Solutions Architects for a zero-to-cluster deep dive on production container orchestration, GitOps automation pipelines, and multi-region failover handling.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAY9rSqWRkhsGSIgV1dgxEiVkIulMMpWWF1kBz0Q9L1SI1TwJBA2ePTTKmwCo86cMg2BJSuD3DWYQTeZDB-neKyppYtwRgADlq6yUHpp6mRjLtGH8WkvzhKQYn7WKmAP41zjz_mS3Nxl-OEtijC9IKiqisN873-XNB0QKipNhYLy74phviamMrKrHku5EKJGgqPJMAxSQI3Tzfbu0ccx2ZXMa96-txQu1xNkqjybRBB9uSfPNmxnZQUgg",
    imageAlt: "Students working on cloud architecture diagrams in a computer science laboratory",
    footer: { kind: "avatar", value: "KL", label: "Instructor: Kenneth Liu, AWS Principal Fellow" },
    action: { label: "Register Seat", icon: ArrowRight },
  },
  {
    id: "library-maintenance",
    category: "System Alerts",
    badge: "Facilities • System Maintenance",
    meta: "Scheduled: Nov 02 - Nov 04",
    title: "Campus Library & Lab Maintenance Schedule for Semester Break",
    body: "Annual hardware upgrades, network switch firmware deployments, and high-performance computing (HPC) cluster recabling will be carried out across Building C and Turing Hall. Remote VPN access remains intact.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD2F9Cb9X9hV-T7Hse0iwUwMYpWVVaJeG29SFD-9UZlCBv_q08lmG9nRhThi0tLqS23uWGRTEbRbL93HVCQb5InHNov4SvreJbZRdGpWW-yW3KkDKgF9bxM7vHuyh7AjrsSckiPzwXcGgIlRFSXHASOgUHscwf2S-xLhHaE3tKf68AMjJVdUOR-eqktUZf6weL0dWoL4OPUg724gqJdcCrg0NGH-4AWheIrFUCG54bc0ssMzXBwZgl1Qg",
    imageAlt: "Minimalist university computational library with glass walls and reading desks",
    footer: { kind: "icon", value: "domain", label: "Turing Hall Labs 01-08 • Main Science Library" },
    action: { label: "View Facility Hours", icon: ExternalLink, href: "#" },
  },
  {
    id: "ai-lecture",
    category: "Campus Events",
    badge: "Guest Lecture • Keynote",
    meta: "Wednesday next week • 11:00 AM",
    title: "Industry Trends in Full-Stack AI Engineering — Dr. Marcus Vance",
    body: "A high-velocity masterclass covering Retrieval-Augmented Generation (RAG) in enterprise workflows, fine-tuning lightweight SLMs, and ethical constraints for autonomous systems.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDjejno8Bb33Er8zmI0DZnR6dGJNGmn94HBKCZcEA8mtw9xqiVXKUm-bntyGVtwLrcEfwbj8OvZhKq_pxlBjC5GYWYuK72qYgmSXc48S23yQJSM4viIFl0ijBwA61hll3C_D9X-Fm4se12wNZ5AoqD0OR7A8UYQd0Qm5wMfYBrGTf4ces3YqyMrLU16w-mA1gY5gkbwwPfXKyNJxerTcgwDovWf9kXwwj3LeIZjhXSAD4ovTh79ZlULPg",
    imageAlt: "Guest lecturer presenting AI code patterns in an academic auditorium",
    footer: { kind: "icon", value: "podium", label: "Auditorium B (Live streaming available)" },
    action: { label: "Add to Calendar", icon: CalendarPlus },
  },
]

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function LandingPageContent({ profileFullName }: { profileFullName: string | null }) {
  const [filter, setFilter] = useState<Filter>("All")

  const items = filter === "All" ? FEED : FEED.filter((item) => item.category === filter)

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <StudentPortalHeader active="home" />

      <div className="w-full pt-16 bg-surface min-h-[calc(100vh-140px)]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-10">
          <div className="flex flex-col w-full">
            <section className="relative w-full rounded-xl bg-surface-container-lowest p-6 md:p-10 shadow-sm overflow-hidden">
              <div className="absolute -right-16 -top-16 w-96 h-96 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
              <div className="absolute -left-12 bottom-0 w-64 h-64 rounded-full bg-surface-container-high/60 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-1">
                <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatToday()}
                </span>
                <h1 className="text-[32px] font-[700] leading-[40px] tracking-[-0.02em] text-on-surface mt-1">
                  Welcome back,{" "}
                  <span className="text-primary-container">
                    {profileFullName ?? "Student"}
                  </span>
                </h1>
              </div>
            </section>

            <div className="w-full mt-10">
              <div className="flex flex-col w-full gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                  <div>
                    <h2 className="text-[20px] font-[600] leading-[28px] text-on-surface">
                      Campus Announcements &amp; Notices
                    </h2>
                    <p className="text-[14px] leading-[20px] text-on-surface-variant">
                      Official broadcasts, departmental memos, and verified notices
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {FILTERS.map((item) => {
                      const count =
                        item === "All"
                          ? FEED.length
                          : FEED.filter((entry) => entry.category === item).length
                      const isActive = filter === item
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFilter(item)}
                          aria-pressed={isActive}
                          className={cn(
                            "px-3 py-1.5 rounded text-[12px] font-[600] transition-all whitespace-nowrap",
                            isActive
                              ? "bg-primary-container text-on-primary"
                              : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-low"
                          )}
                        >
                          {item} ({count})
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="relative rounded-xl bg-surface-container-lowest p-6 shadow-sm overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container" />
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed text-[12px] font-[500] leading-[16px] uppercase tracking-wider font-semibold">
                        <Pin className="w-[15px] h-[15px]" />
                        Important Notice • Academic Affairs
                      </span>
                      <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant flex items-center gap-1">
                        <Clock className="w-[15px] h-[15px]" />
                        Posted 2 hours ago • Dean of Computing
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[24px] font-[600] leading-[32px] text-on-surface tracking-tight hover:text-secondary transition-colors cursor-pointer">
                        Mid-Term Examination Timetable &amp; Lab Allocation Published
                      </h3>
                      <p className="text-[16px] leading-[24px] text-on-surface-variant mt-2 leading-relaxed">
                        The Department of Computing has ratified the Fall 2024 Mid-Term
                        schedule. Formal written theory and proctored coding assessments will
                        commence next Monday. Students enrolled in Advanced Algorithms and
                        Distributed Systems must observe their designated lab workstation
                        allocations (Lab-04 and Cyber Range A). Ensure git commits for continuous
                        assessment repositories are synchronized 24 hours prior to examination
                        sittings.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-surface-container-low p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                        <div>
                          <span className="text-[12px] font-[500] leading-[16px] text-on-surface font-semibold">
                            Assigned Stations
                          </span>
                          <p className="text-[14px] leading-[20px] text-on-surface-variant">
                            Lab-04 (Terminal 12) • Cyber Range A
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="w-5 h-5 text-secondary mt-0.5" />
                        <div>
                          <span className="text-[12px] font-[500] leading-[16px] text-on-surface font-semibold">
                            Verification Requirement
                          </span>
                          <p className="text-[14px] leading-[20px] text-on-surface-variant">
                            Physical Student Smart Card + 2FA Key
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <a
                        href="#"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-container text-on-primary text-[14px] font-[600] leading-[16px] tracking-[0.05em] hover:bg-secondary transition-colors shadow-sm"
                      >
                        <Download className="w-[18px] h-[18px]" />
                        <span>Download Exam Schedule (PDF)</span>
                      </a>
                      <a
                        href="#"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container-high text-on-surface text-[14px] font-[600] leading-[16px] tracking-[0.05em] hover:bg-surface-container-low transition-colors"
                      >
                        <DoorOpen className="w-[18px] h-[18px]" />
                        <span>View Room Allocation</span>
                      </a>
                      <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant ml-auto hidden md:inline-flex items-center gap-1">
                        <Lock className="w-[14px] h-[14px]" />
                        Authenticated Document
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {items.map((item) => {
                    const ActionIcon = item.action.icon
                    const actionClasses =
                      "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-primary-container hover:text-on-primary transition-all text-[12px] font-[500] leading-[16px]"

                    return (
                      <article
                        key={item.id}
                        className="rounded-xl bg-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden shrink-0 bg-surface-container-high">
                            <Image
                              src={item.image}
                              alt={item.imageAlt}
                              width={192}
                              height={128}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex flex-col justify-between flex-1 gap-2">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high text-[12px] font-[500] leading-[16px] text-on-surface font-medium">
                                  {item.badge}
                                </span>
                                <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                                  {item.meta}
                                </span>
                              </div>
                              <h4 className="text-[20px] font-[600] leading-[28px] text-on-surface mt-1.5 hover:text-secondary transition-colors cursor-pointer">
                                {item.title}
                              </h4>
                              <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1 line-clamp-2">
                                {item.body}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                              {item.footer.kind === "avatar" ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-secondary-fixed flex items-center justify-center text-[12px] font-[500] leading-[16px] text-on-secondary-fixed font-bold">
                                    {item.footer.value}
                                  </div>
                                  <span className="text-[12px] font-[500] leading-[16px] text-on-surface">
                                    {item.footer.label}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-on-surface-variant text-[12px] font-[500] leading-[16px]">
                                  <Building2 className="w-4 h-4" />
                                  <span>{item.footer.label}</span>
                                </div>
                              )}

                              {item.action.href ? (
                                <a href={item.action.href} className={actionClasses}>
                                  <span>{item.action.label}</span>
                                  <ActionIcon className="w-4 h-4" />
                                </a>
                              ) : (
                                <button type="button" className={actionClasses}>
                                  <span>{item.action.label}</span>
                                  <ActionIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}

                  {items.length === 0 && (
                    <div className="rounded-xl bg-surface-container-lowest p-10 text-center shadow-sm">
                      <p className="text-[14px] leading-[20px] text-on-surface-variant">
                        No notices in this category yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StudentPortalFooter />
    </div>
  )
}