"use client"

import { useEffect, useRef } from "react"
import { useForm, useWatch } from "react-hook-form"
import { X, User, Mail, Phone } from "lucide-react"
import { Input } from "@/components/ui/input.component"
import { Button } from "@/components/ui/button.component"
import { cn } from "@/lib/utils.util"
import type { Profile } from "@/types/profile.type"
import { refetchData } from "@/lib/action.action"

type Role = "student" | "teacher" | "admin"

interface EditFormValues {
  full_name: string
  email: string
  role: Role
  phone: string
  address: string
  date_of_birth: string
}

const ROLES: Role[] = ["student", "teacher", "admin"]

const PHONE_PATTERN = /^\+?[0-9\s\-().]{7,20}$/

interface EditProfilePanelProps {
  profile: Profile
  onClose: () => void
}

export function EditProfilePanel({ profile, onClose }: EditProfilePanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    defaultValues: {
      full_name: profile.full_name,
      email: profile.email,
      role: (profile.role as Role) || "student",
      phone: profile.phone,
      address: profile.address,
      date_of_birth: profile.date_of_birth,
    },
  })

  const selectedRole = useWatch({ control, name: "role" })

  useEffect(() => {
    reset({
      full_name: profile.full_name,
      email: profile.email,
      role: (profile.role as Role) || "student",
      phone: profile.phone,
      address: profile.address,
      date_of_birth: profile.date_of_birth,
    })
  }, [profile, reset])

  useEffect(() => {
    closeRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  async function onSubmit(data: EditFormValues) {
    const res = await fetch(`/api/profile/${profile.id}`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(data)
    })


    const profileData = await res.json()


    console.log(profileData)
    await refetchData("/admin/dashboard/students")
    onClose()
  }

  const inputErrorClass = "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      <button
        type="button"
        aria-label="Close edit profile"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-300 motion-reduce:animate-none"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">
        <header className="relative bg-primary-container px-6 pb-5 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">CodePoint Academy</p>
          <h2 className="mt-2 text-[20px] font-[800] leading-[28px] text-white">Edit profile</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close edit profile"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-6 py-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface" htmlFor="full_name">
                Full name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  id="full_name"
                  className={cn("pl-10", inputErrorClass)}
                  aria-invalid={!!errors.full_name}
                  {...register("full_name", {
                    required: "Full name is required",
                    minLength: { value: 2, message: "Full name must be at least 2 characters" },
                  })}
                />
              </div>
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  id="email"
                  className={cn("pl-10", inputErrorClass)}
                  aria-invalid={!!errors.email}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                  type="text"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="phone">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    id="phone"
                    className={cn("pl-10", inputErrorClass)}
                    aria-invalid={!!errors.phone}
                    {...register("phone", {
                      validate: (value) =>
                        value.trim() === "" || PHONE_PATTERN.test(value.trim()) || "Enter a valid phone number",
                    })}
                    type="text"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="date_of_birth">
                  Date of birth
                </label>
                <Input
                  id="date_of_birth"
                  className={cn(inputErrorClass, "px-3")}
                  aria-invalid={!!errors.date_of_birth}
                  {...register("date_of_birth", {
                    validate: (value) => {
                      if (!value) return true
                      const date = new Date(value)
                      if (isNaN(date.getTime())) return "Enter a valid date"
                      if (date > new Date()) return "Date of birth can't be in the future"
                      return true
                    },
                  })}
                  type="date"
                />
                {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface" htmlFor="address">
                Address
              </label>
              <textarea
                id="address"
                rows={3}
                className={cn(
                  "flex w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-all outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  inputErrorClass
                )}
                aria-invalid={!!errors.address}
                placeholder="Street, city, postal code"
                {...register("address", {
                  maxLength: { value: 200, message: "Address must be at most 200 characters" },
                })}
              />
              {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-on-surface">Role</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Role">
                {ROLES.map((role) => (
                  <label
                    key={role}
                    className={cn(
                      "cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors",
                      selectedRole === role
                        ? "border-transparent bg-primary text-on-primary"
                        : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-primary hover:text-primary"
                    )}
                  >
                    <input
                      type="radio"
                      value={role}
                      className="sr-only"
                      {...register("role", { required: "Select a role" })}
                    />
                    <span className="capitalize">{role}</span>
                  </label>
                ))}
              </div>
              {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
            </div>
          </div>

          <footer className="flex justify-end gap-3 border-t border-outline-variant/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </footer>
        </form>
      </div>
    </div>
  )
}
