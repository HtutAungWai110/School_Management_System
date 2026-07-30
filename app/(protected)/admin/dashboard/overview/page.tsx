
import { MetricCard } from "../metric-card"
import { ActivityItem } from "../activity-item"
import { AdmissionRow } from "../admission-row"
import { Search, CircleHelp, Bell, GraduationCap, User, Users, ClipboardList, AlertTriangle, Mail } from "lucide-react"

import { serverFetch } from "@/lib/server.fetch"


export default async function AdminPage() {

  const { teacherCount, studentCount } = await serverFetch("http://localhost:3000/api/school/overview").then((res) => res.json())

  console.log(teacherCount, studentCount)

  return (
    <div className="min-h-screen bg-background flex">

      <main className="flex-1 ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Overview</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/10">
                <Search className="w-5 h-5 text-on-surface-variant mr-2" />
                <input
                  className="bg-transparent border-none focus:outline-none text-[14px] leading-[20px] text-on-surface placeholder:text-on-surface-variant w-48"
                  placeholder="Search data..."
                  type="text"
                />
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="font-label-md text-label-md">Help</span>
              </button>
              <div className="relative">
                <Bell className="w-5 h-5 text-on-surface-variant cursor-pointer" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <div className="px-12 py-10 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <MetricCard
              icon={GraduationCap}
              label="Total Students"
              value={studentCount ?? 0}
              badge="+12%"
              badgeClass="text-green-600 bg-green-50"
              iconBg="bg-secondary-container/50"
              iconColor="text-secondary"
              subtitle="Enrolled"
            />
            <MetricCard
              icon={User}
              label="Total Teachers"
              value={teacherCount ?? 0}
              badge="Stable"
              badgeClass="text-on-surface-variant bg-surface-container"
              iconBg="bg-tertiary-fixed/30"
              iconColor="text-on-tertiary-fixed-variant"
              subtitle="Active"
            />
            <MetricCard
              icon={Users}
              label="Total Batches"
              value={12}
              badge="New Semester"
              badgeClass="text-on-primary-fixed-variant bg-primary-fixed/50"
              iconBg="bg-primary-fixed/30"
              iconColor="text-on-primary-fixed-variant"
              subtitle="Live Courses"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Student Attendance</h2>
                  <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
                    Average attendance rate this month: <span className="font-bold text-primary">94.2%</span>
                  </p>
                </div>
                <select className="bg-surface-container-low border-none rounded-lg text-[12px] font-[500] leading-[16px] text-on-surface focus:ring-1 focus:ring-primary px-3 py-2">
                  <option>Last 30 Days</option>
                  <option>Last Quarter</option>
                </select>
              </div>
              <div className="h-64 relative flex items-end justify-between gap-2 px-4">
                <div className="absolute inset-0 border-b border-outline-variant/20 flex flex-col justify-between">
                  <div className="w-full border-t border-outline-variant/5" />
                  <div className="w-full border-t border-outline-variant/5" />
                  <div className="w-full border-t border-outline-variant/5" />
                  <div className="w-full border-t border-outline-variant/5" />
                </div>
                {[92, 75, 95, 83, 88, 94, 78].map((h, i) => (
                  <div
                    key={i}
                    className={`w-full rounded-t-lg transition-all hover:brightness-110 relative group ${i === 4 ? "bg-primary" : "bg-secondary/10 hover:bg-secondary/30"}`}
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {h}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 px-4">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                  <span key={day} className={`text-[12px] font-[500] leading-[16px] ${i === 4 ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                    {day}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Activity</h2>
                <button className="text-secondary text-[12px] font-[500] leading-[16px] hover:underline">View all</button>
              </div>
              <div className="space-y-6">
                <ActivityItem icon={ClipboardList} bg="bg-secondary-fixed" iconColor="text-on-secondary-fixed" time="2 hours ago">
                  New batch <span className="font-bold">CS-204</span> was created by Admin.
                </ActivityItem>
                <ActivityItem icon={AlertTriangle} bg="bg-tertiary-fixed" iconColor="text-on-tertiary-fixed" time="5 hours ago">
                  Attendance report for <span className="font-bold">Grade 10</span> is missing.
                </ActivityItem>
                <ActivityItem icon={Mail} bg="bg-surface-container-high" iconColor="text-on-surface-variant" time="Yesterday">
                  Teacher <span className="font-bold">Sarah Jenkins</span> submitted leave request.
                </ActivityItem>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Pending Admissions</h2>
                <button className="bg-primary text-on-primary px-6 py-2 rounded text-[14px] font-[600] leading-[16px] tracking-[0.05em] hover:bg-secondary transition-colors duration-200">
                  Process All
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    {["Student Name", "Applied Course", "Date", "Status", "Action"].map((h) => (
                      <th key={h} className="px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <AdmissionRow initials="JD" name="John Doe" course="Intro to Web Dev" date="Oct 24, 2024" status="Reviewing" statusClass="bg-yellow-100 text-yellow-800" />
                  <AdmissionRow initials="AS" name="Alice Smith" course="Data Structures" date="Oct 23, 2024" status="Interviewed" statusClass="bg-blue-100 text-blue-800" />
                  <AdmissionRow initials="MB" name="Michael Brown" course="Advanced Python" date="Oct 22, 2024" status="Reviewing" statusClass="bg-yellow-100 text-yellow-800" />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="bg-surface-container-lowest border-t border-outline-variant/10 mt-10">
          <div className="flex flex-col md:flex-row justify-between items-center px-12 py-6 w-full max-w-[1440px] mx-auto">
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
