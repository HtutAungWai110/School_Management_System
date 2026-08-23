"use client"

import { useEffect, useState } from "react"

import type { BatchModule, BatchTeacherModule } from "@/types/batch.type"

export function useBatchModules(batchId: string | undefined) {
  const [batchModules, setBatchModules] = useState<BatchModule[]>([])

  useEffect(() => {
    if (!batchId) return

    let cancelled = false

    fetch(`/api/batches/${batchId}/batch_modules`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load batch modules.")
        return res.json() as Promise<BatchModule[]>
      })
      .then((data) => {
        if (!cancelled) setBatchModules(data ?? [])
      })
      .catch(() => {
        if (!cancelled) setBatchModules([])
      })

    return () => {
      cancelled = true
    }
  }, [batchId])

  return batchModules
}

export function useBatchTeacherPairs(batchId: string | undefined) {
  const [batchTeacherPairs, setBatchTeacherPairs] = useState<BatchTeacherModule[]>([])

  useEffect(() => {
    if (!batchId) return

    let cancelled = false

    fetch(`/api/batches/${batchId}/teacher_modules`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load batch teachers.")
        return res.json() as Promise<BatchTeacherModule[]>
      })
      .then((data) => {
        if (!cancelled) setBatchTeacherPairs(data ?? [])
      })
      .catch(() => {
        if (!cancelled) setBatchTeacherPairs([])
      })

    return () => {
      cancelled = true
    }
  }, [batchId])

  return batchTeacherPairs
}
