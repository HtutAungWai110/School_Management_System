"use client"

import { useState } from "react"
import { Pencil, Check, X } from "lucide-react"

import { cn } from "@/lib/utils.util"

interface Props {
  label: string
  value: string
  /** Omit to render the row read-only. Each row saves on its own so a
   *  failure never leaves unrelated fields half-applied. */
  onSave?: (value: string) => Promise<void>
  type?: "text" | "date" | "textarea"
  hint?: string
  placeholder?: string
  displayValue?: string
}

export default function SettingsFieldRow({
  label,
  value,
  onSave,
  type = "text",
  hint,
  placeholder,
  displayValue,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const readOnly = !onSave
  const isEmpty = value.trim() === ""
  const shown = displayValue ?? value

  function startEditing() {
    setDraft(value)
    setError("")
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setDraft(value)
    setError("")
  }

  async function save() {
    if (!onSave || saving) return
    setSaving(true)
    setError("")
    try {
      await onSave(draft.trim())
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-surface-container-low/50 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-foreground">{label}</span>

        {editing ? (
          <div className="mt-2 space-y-2">
            {type === "textarea" ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder={placeholder}
                className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-[14px] text-foreground transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
              />
            ) : (
              <input
                type={type}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[14px] text-foreground transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
              />
            )}

            {error && <p className="text-[12px] text-error">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity enabled:hover:opacity-90 disabled:opacity-50"
              >
                <Check className="size-3.5" />
                {saving ? "Saving" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                <X className="size-3.5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p
              className={cn(
                "mt-0.5 break-words text-[14px] text-on-surface-variant",
                isEmpty && !displayValue && "text-on-surface-variant/60"
              )}
            >
              {isEmpty && !displayValue ? "Not set" : shown}
            </p>
            {hint && <p className="mt-1 text-[12px] text-on-surface-variant/70">{hint}</p>}
          </>
        )}
      </div>

      {!editing && !readOnly && (
        <button
          type="button"
          onClick={startEditing}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-surface-container-low px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-container-high"
        >
          <Pencil className="size-3.5" />
          Edit
        </button>
      )}
    </div>
  )
}
