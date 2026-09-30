"use client"

import Image from "next/image"

import { useProfileStore } from "@/components/profile/profile.state"

export default function ProfileCard() {
  const { profile } = useProfileStore()

  if (!profile?.full_name) return null

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-container">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.full_name}
            width={36}
            height={36}
            className="size-full object-cover"
          />
        ) : (
          // Brand ink on the pale brand tint, not white — white type on
          // primary-container was invisible on the light surface.
          <span className="text-[13px] font-semibold text-primary">{initials}</span>
        )}
      </div>
      <div className="hidden flex-col sm:flex">
        <span className="text-[14px] font-medium leading-4 text-foreground">{profile.full_name}</span>
        <span className="text-[12px] leading-4 capitalize text-on-surface-variant">{profile.role}</span>
      </div>
    </div>
  )
}
