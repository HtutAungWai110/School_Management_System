"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Assignment } from "@/types/batch.type"

type Result = {
  /** The url + reload counter this result belongs to. */
  key: string
  rows: Assignment[]
  totalCount: number
  totalPages: number
  error: string | null
}

/** Takes the endpoint rather than a batch id, so the same hook serves the
 *  admin batch panel, the teacher's own assignments page, and the paginated
 *  admin assignments list. */
export function useAssignmentsData(url: string) {
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  /* Request identity drives the loading state instead of a `setLoading(true)`
     inside the effect, which the react-hooks lint rules reject and which
     would also cause a cascading render on every page change. Anything already
     fetched under a different key is stale and must not be shown. */
  const key = useMemo(() => `${url}::${reloadKey}`, [url, reloadKey])
  const settled = result !== null && result.key === key

  useEffect(() => {
    let cancelled = false

    fetch(url, { credentials: "include" })
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
        if (cancelled) return

        /* Two live shapes: /api/assignments paginates into an envelope, while
           /api/batches/[id]/assignments and /api/teacher/assignments still
           return a bare array. Normalise both into one shape. */
        if (Array.isArray(json)) {
          setResult({ key, rows: json, totalCount: json.length, totalPages: 1, error: null })
        } else {
          const rows = (json?.assignments ?? json?.data ?? []) as Assignment[]
          setResult({
            key,
            rows,
            totalCount: json?.totalCount ?? rows.length,
            totalPages: json?.totalPages ?? 1,
            error: null,
          })
        }
      })
      .catch((err) => {
        if (cancelled) return
        setResult({
          key,
          rows: [],
          totalCount: 0,
          totalPages: 1,
          error: err instanceof Error ? err.message : "Failed to load assignments",
        })
      })

    return () => {
      cancelled = true
    }
  }, [url, key])

  return {
    assignments: settled ? result.rows : null,
    totalCount: settled ? result.totalCount : 0,
    totalPages: settled ? result.totalPages : 1,
    loading: !settled,
    error: settled ? result.error : null,
    refresh,
  }
}