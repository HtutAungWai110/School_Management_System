"use client"

import { useCallback, useEffect, useState } from "react"
import type { Assignment } from "@/types/batch.type"

export function useAssignmentsData(batchId: string) {
  const [data, setData] = useState<Assignment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const loading = data === null && error === null

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetch(`/api/batches/${batchId}/assignments`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          return res
            .json()
            .catch(() => null)
            .then((err) => {
              throw new Error(err?.error ?? "Failed to load assignments")
            })
        }
        return res.json()
      })
      .then((json) => {
        if (!cancelled) {
          setData(Array.isArray(json) ? json : (json?.data ?? []))
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load assignments")
        }
      })

    return () => {
      cancelled = true
    }
  }, [batchId, reloadKey])

  return { data, loading, error, refresh }
}