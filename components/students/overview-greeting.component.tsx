"use client"

import { useProfileStore } from "@/components/profile/profile.state"

export default function OverviewGreeting({
  now,
  batchName,
}: {
  now: Date
  batchName: string
}) {
  const fullName = useProfileStore((state) => state.profile.full_name)

  const hour = now.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <header className="mb-6">
      <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">
        {greeting}
        {fullName ? `, ${fullName}` : ""}
      </h1>
      <p className="mt-1 text-[14px] text-primary/80">{batchName}</p>
    </header>
  )
}