"use client"

import { useProfileStore } from "@/components/profile/profile.state"
import Image from "next/image"
import { ChevronDown } from "lucide-react"

export default function ProfileCard() {
  const { profile } = useProfileStore()

  if (!profile?.full_name) return null

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container transition-all cursor-pointer group">
      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden shrink-0">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.full_name}
            width={40}
            height={40}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-white font-bold text-sm">
            {profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="font-label-md text-label-md text-on-surface">{profile.full_name}</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant capitalize">{profile.role}</span>
      </div>
      <ChevronDown className="ml-auto text-on-surface-variant w-[18px] h-[18px]" />
    </div>
  )
}
