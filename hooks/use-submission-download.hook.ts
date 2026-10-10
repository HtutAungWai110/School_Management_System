"use client"

import { useCallback, useState } from "react"

/**
 * Fetches a short-lived signed URL for one submission and hands it to the
 * browser.
 *
 * The `assignments` bucket is private, so there is no link to point an anchor
 * at — the API authorises the caller before it signs anything. Shared by the
 * student submission section and the admin submissions table.
 */
export function useSubmissionDownload() {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async (submissionId: string) => {
    setPendingId(submissionId)
    setError(null)

    try {
      const res = await fetch(`/api/assignments/submissions/${submissionId}/download`, {
        credentials: "include",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "We couldn't prepare that file for download.")
      }

      const { url } = (await res.json()) as { url: string }
      window.open(url, "_blank", "noreferrer")
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't prepare that file for download.")
    } finally {
      setPendingId(null)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { download, pendingId, error, clearError }
}