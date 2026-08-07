"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { MoreVertical, Eye, Pencil, Trash2 } from "lucide-react"
import type { Profile } from "@/types/profile.type"
import { ProfileViewPanel } from "./profile-view-panel.component"
import { EditProfilePanel } from "./edit-profile-panel.component"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatId(id: string) {
  return `${id.slice(0, 4).toUpperCase()}-${id.slice(4, 8)}`
}

export function ProfileTemplate({ profile }: { profile: Profile }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  function closeView() {
    setViewOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <tr className="hover:bg-surface-container-low transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <Image
              className="w-10 h-10 rounded-full object-cover border border-outline-variant/20"
              src={profile.avatar_url}
              alt={profile.full_name}
              width={40}
              height={40}
              unoptimized
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center font-bold text-on-surface-variant text-sm">
              {getInitials(profile.full_name)}
            </div>
          )}
          <div>
            <p className="text-[16px] leading-[24px] font-bold text-on-surface">{profile.full_name}</p>
            <p className="text-[14px] leading-[20px] text-on-surface-variant">ID: {formatId(profile.id)}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">{profile.email}</td>
      <td className="px-6 py-4">
        <span className="px-2.5 py-0.5 rounded-full text-on-background/10 bg-primary-fixed/50 border border-secondary-container text-[12px] font-[500] leading-[16px] capitalize">
          {profile.role}
        </span>
      </td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
        {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="relative inline-block" ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            aria-label="Profile actions"
            onClick={() => setMenuOpen((open) => !open)}
            className="cursor-pointer text-on-surface-variant hover:text-primary transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg py-1">
              {[
                {
                  label: "View",
                  icon: Eye,
                  onClick: () => {
                    setMenuOpen(false)
                    setViewOpen(true)
                  },
                },
                { label: "Edit", icon: Pencil, onClick: () => { setMenuOpen(false); setEditOpen(true) } },
                { label: "Delete", icon: Trash2 },
              ].map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-[14px] leading-[20px] text-on-surface hover:bg-surface-container transition-colors"
                >
                  <Icon className="w-4 h-4 text-on-surface-variant" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      </tr>
      {viewOpen && <ProfileViewPanel profile={profile} onClose={closeView} />}
      {editOpen && <EditProfilePanel profile={profile} onClose={() => setEditOpen(false)} />}
    </>
  )
}
