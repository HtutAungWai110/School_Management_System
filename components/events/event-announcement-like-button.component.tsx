"use client"

import { useCallback, useEffect, useState } from "react"
import { Heart } from "lucide-react"

import { cn } from "@/lib/utils.util"

/**
 * The like control on a campus post. It owns its own state so a tap never has
 * to wait for the page to re-render; the server response is the source of
 * truth and replaces the optimistic value, or the guess is rolled back.
 *
 * Mirrors the batch announcement button: the liked flag is probed separately
 * because the feed row only carries the aggregate count.
 */
export function EventAnnouncementLikeButton({
  announcementId,
  likeCount,
}: {
  announcementId: string
  likeCount: number
}) {
  /* Starts unliked by design: the probe below is what may flip it. */
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(likeCount)
  const [pending, setPending] = useState(false)

  const syncLikedState = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/event-announcements/${announcementId}/is_liked`,
        { credentials: "include", cache: "no-store" }
      )

      if (!response.ok) return

      const body = (await response.json().catch(() => null)) as { liked?: unknown } | null

      if (typeof body?.liked === "boolean") {
        setLiked(body.liked)
      }
    } catch {
      /* A failed probe leaves the default in place: the post still reads, only
         the toggle starts from "not liked". The server rejects any duplicate
         or missing like on the next tap anyway. */
    }
    /* A new server count re-runs the probe even though the request itself only
       reads the liked flag; the array is part of the agreed sync contract. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementId, likeCount])

  useEffect(() => {
    /* The probe only writes state after its response resolves, so nothing is
       set synchronously here; the compiler's setState tracking does not model
       the await boundary. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncLikedState()
  }, [syncLikedState])

  async function toggle() {
    if (pending) return

    const next = !liked
    const previousLiked = liked
    const previousCount = count

    /* Paint the change before the request so the tap feels instant. */
    setLiked(next)
    setCount((value) => Math.max(0, value + (next ? 1 : -1)))
    setPending(true)

    try {
      const response = await fetch(`/api/event-announcements/${announcementId}/like`, {
        method: next ? "POST" : "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Like request failed with ${response.status}`)
      }

      const body = (await response.json().catch(() => null)) as {
        liked?: unknown
        likes_count?: unknown
      } | null

      /* The server may know better than the optimistic guess (for example a
         like that already existed), so its answer wins. */
      if (typeof body?.liked === "boolean") setLiked(body.liked)
      if (typeof body?.likes_count === "number") setCount(body.likes_count)
    } catch {
      /* The change was not committed, so put back the last confirmed state. */
      setLiked(previousLiked)
      setCount(previousCount)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={liked}
      aria-busy={pending}
      className="inline-flex items-center gap-1.5 rounded-full text-on-surface transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait"
    >
      <Heart
        className={cn("size-4 transition-colors", liked && "fill-error text-error")}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span
        className={cn(
          "text-[12px] font-medium leading-4 tabular-nums",
          liked && "text-error"
        )}
      >
        {count}
      </span>
      <span className="sr-only">{count === 1 ? "like" : "likes"}</span>
    </button>
  )
}
