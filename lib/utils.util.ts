import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getModuleColor(moduleId: string) {
  const hex = moduleId.replace(/-/g, "").slice(0, 6)
  return `#${hex}`
}

export function getModuleColorWithOpacity(moduleId: string, opacity: number) {
  const hex = moduleId.replace(/-/g, "").slice(0, 6)
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export const STATUS_CONFIG = {
  ongoing: { color: "#22c55e", label: "Ongoing" },
  "on break": { color: "#eab308", label: "On Break" },
  completed: { color: "#3b82f6", label: "Completed" },
} as const

export type StatusKey = keyof typeof STATUS_CONFIG
