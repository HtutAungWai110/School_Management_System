"use client"

import { useRef, useState, useEffect } from "react"
import { MoreVertical, Pencil, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Class } from "@/types/class.type"
import { TimetableEditPanel } from "./timetable-edit-panel.component"
import { TimetableCheckInButton } from "./timetable-check-in-button.component"
import { getModuleColorWithOpacity, STATUS_CONFIG, type StatusKey } from "@/lib/utils.util"
import type { TimetableSession } from "./timetable-session-table.component"

function isToday(dayOfWeek: number): boolean {
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay()
  return dayOfWeek === today
}

interface TimetableSessionCardProps {
  session: TimetableSession
  classes?: Class[]
  compact?: boolean
}

export function TimetableSessionCard({ session, classes, compact = false }: TimetableSessionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
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

  useEffect(() => {
    if (!isToday(session.day_of_week)) return
    async function fetchAttendance() {
      try {
        const res = await fetch(`/api/teacher/timetable/${session.id}/today`)
        const data = await res.json()
        if (data && data.id) {
          setCheckedIn(true)
        }
      } catch (error) {
        console.error(error)
      }
    }
    fetchAttendance()
  }, [session.id, session.day_of_week])

  const moduleColor = getModuleColorWithOpacity(session.module_id, 0.3)
  const statusCfg = STATUS_CONFIG[session.status as StatusKey]

  async function handleCheckIn(session: TimetableSession) {
    if (checkedIn || checkingIn) return
    setCheckingIn(true)
    try {
      const res = await fetch("/api/attendances/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetable_id: session.id,
          module_id: session.module_id,
          batch_id: session.batch_id,
          date: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      console.log(data)
      setCheckedIn(true)
    } catch (error) {
      console.error(error)
    } finally {
      setCheckingIn(false)
    }
  }

if (compact) {
     return (
       <>
         <div className="group relative rounded-lg border border-outline-variant/20 bg-surface-container-low/30 p-2.5 hover:border-primary/30 hover:bg-surface-container-low/60 transition-all duration-150 min-h-[80px]">
           <div className="flex items-start justify-between gap-1 mb-1">
             <Link href={`/teacher/dashboard/timetable/${session.id}`}>
               <span
                 className="text-[10px] font-[500] leading-[13px] tracking-wide truncate px-1.5 py-0.5 rounded"
                 style={{ backgroundColor: moduleColor }}
               >
                 {session.modules.code}
               </span>
             </Link>
             <div className="relative shrink-0" ref={menuRef}>
               <button
                 ref={triggerRef}
                 type="button"
                 aria-label="Actions"
                 onClick={() => setMenuOpen((v) => !v)}
                 className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100"
               >
                 <MoreVertical className="w-3 h-3" />
               </button>
               {menuOpen && (
                 <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg animate-in fade-in-0 zoom-in-95">
                   <button
                     type="button"
                     onClick={() => {
                       setMenuOpen(false)
                       setEditOpen(true)
                     }}
                     className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[11px] leading-[14px] text-on-surface hover:bg-surface-container transition-colors rounded-lg"
                   >
                     <Pencil className="w-3 h-3" />
                     Edit
                   </button>
                 </div>
               )}
             </div>
           </div>
 
           <Link href={`/teacher/dashboard/timetable/${session.id}`}>
             <p className="text-[10px] leading-[13px] text-on-surface-variant mb-1.5 line-clamp-2">
               {session.modules.title}
             </p>
           </Link>
 
           <div className="space-y-0.5">
             <p className="text-[9px] leading-[12px] text-on-surface-variant truncate">
               {session.batches.batch_name} · {session.batches.count}
             </p>
             <div className="flex items-center gap-1 text-[9px] leading-[12px] text-on-surface-variant">
               <MapPin className="w-2.5 h-2.5 shrink-0" />
               <span className="truncate">Lab-{session.class_id.slice(0, 2).toUpperCase()}</span>
             </div>
           </div>
 
           <div className="mt-1.5 flex items-center gap-1">
             {statusCfg && (
               <span
                 className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                 style={{ backgroundColor: statusCfg.color }}
               />
             )}
             <span className="text-[8px] font-[600] leading-[10px] text-on-surface-variant">
               {session.status}
             </span>
           </div>
           <TimetableCheckInButton
             sessionId={session.id}
             dayOfWeek={session.day_of_week}
             moduleId={session.module_id}
             batchId={session.batch_id}
           />
         </div>
 
         {editOpen && (
           <TimetableEditPanel
             session={session}
             classes={classes ?? []}
             onClose={() => {
               setEditOpen(false)
               triggerRef.current?.focus()
             }}
           />
         )}
       </>
     )
   }

return (
     <>
       <div className="group relative rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-[0_2px_4px_-1px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-primary/30 transition-all duration-200">
         <div className="flex items-start justify-between gap-2 mb-3">
           <div className="flex items-center gap-2">
             <Link href={`/teacher/dashboard/timetable/${session.id}`}>
               <span
                 className="text-[13px] font-[700] leading-[16px] tracking-wide px-2 py-0.5 rounded"
                 style={{ backgroundColor: moduleColor, color: statusCfg?.color ?? "#1f2937" }}
               >
                 {session.modules.code}
               </span>
             </Link>
             <div className="flex items-center gap-1.5">
               {statusCfg && (
                 <span
                   className="inline-block w-2 h-2 rounded-full shrink-0"
                   style={{ backgroundColor: statusCfg.color }}
                 />
               )}
               <span className="text-[10px] font-[600] leading-[14px] text-on-surface-variant">
                 {session.status}
               </span>
             </div>
           </div>
           <div className="relative" ref={menuRef}>
             <button
               ref={triggerRef}
               type="button"
               aria-label="Actions"
               onClick={() => setMenuOpen((v) => !v)}
               className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100"
             >
               <MoreVertical className="w-3.5 h-3.5" />
             </button>
             {menuOpen && (
               <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg animate-in fade-in-0 zoom-in-95">
                 <button
                   type="button"
                   onClick={() => {
                     setMenuOpen(false)
                     setEditOpen(true)
                   }}
                   className="flex w-full items-center gap-2 px-3 py-2 text-[13px] leading-[18px] text-on-surface hover:bg-surface-container transition-colors rounded-lg"
                 >
                   <Pencil className="w-3.5 h-3.5" />
                   Edit
                 </button>
               </div>
             )}
           </div>
         </div>
 
         <Link href={`/teacher/dashboard/timetable/${session.id}`}>
           <p className="text-[12px] leading-[16px] text-on-surface-variant mb-3 line-clamp-2">
             {session.modules.title}
           </p>
         </Link>
 
         <div className="space-y-1.5">
           <div className="flex items-center gap-1.5 text-[11px] leading-[14px] text-on-surface-variant">
             <span className="font-[600] text-on-surface">{session.batches.batch_name}</span>
             <span>·</span>
             <span>{session.batches.count} students</span>
           </div>
         </div>
         <TimetableCheckInButton
           sessionId={session.id}
           dayOfWeek={session.day_of_week}
           moduleId={session.module_id}
           batchId={session.batch_id}
         />
       </div>
 
       {editOpen && (
         <TimetableEditPanel
           session={session}
           classes={classes ?? []}
           onClose={() => {
             setEditOpen(false)
             triggerRef.current?.focus()
           }}
         />
       )}
     </>
   )
}
