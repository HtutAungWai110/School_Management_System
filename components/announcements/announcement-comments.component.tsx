"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"
import { initialsOf, timeAgo } from "@/lib/format.util"
import { cn } from "@/lib/utils.util"
import type {
  AnnouncementComment,
  AnnouncementCommentPage,
} from "@/types/announcement.type"

const PAGE_SIZE = 50
const MAX_COMMENT_LENGTH = 2000

/**
 * The thread for one announcement.
 *
 * Loaded only when the wrapper opens, one page at a time, oldest first. New
 * comments are appended and the parent is told the fresh total so the count on
 * the icon stays in step without a server refresh.
 */
export function AnnouncementComments({
  batchId,
  announcementId,
  initialCount,
  onCountChange,
}: {
  batchId: string
  announcementId: string
  initialCount: number
  onCountChange: (count: number) => void
}) {
  const [comments, setComments] = useState<AnnouncementComment[]>([])
  const [postedComments, setPostedComments] = useState<AnnouncementComment[]>([])
  const [loadedPage, setLoadedPage] = useState(0)
  const [total, setTotal] = useState(initialCount)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const stickToBottomRef = useRef(false)
  const loadingRef = useRef(false)

  const commentsUrl = `/api/batches/${batchId}/announcement/${announcementId}/comments`

  const loadPage = useCallback(
    async (nextPage: number) => {
      if (loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${commentsUrl}?page=${nextPage}&limit=${PAGE_SIZE}`, {
          credentials: "include",
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Comments request failed with ${response.status}`)
        }

        const body = (await response.json()) as AnnouncementCommentPage
        const rows = Array.isArray(body?.data) ? body.data : []
        const nextTotal = typeof body?.total === "number" ? body.total : rows.length

        setComments((current) => (nextPage === 1 ? rows : [...current, ...rows]))
        setLoadedPage(nextPage)
        setTotal(nextTotal)
        setHasMore(Boolean(body?.has_more))
        onCountChange(nextTotal)
      } catch {
        setError("Could not load comments. Check your connection and try again.")
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [commentsUrl, onCountChange]
  )

  useEffect(() => {
    /* The request writes state after its response resolves, not synchronously;
       the compiler's setState tracking does not model the await boundary. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage(1)
  }, [loadPage])

  useEffect(() => {
    if (!stickToBottomRef.current) return

    stickToBottomRef.current = false
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
    inputRef.current?.focus()
  }, [comments, postedComments])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = draft.trim()
    if (!content || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(commentsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      })

      const body = (await response.json().catch(() => null)) as
        | { data?: AnnouncementComment; comments_count?: number; error?: string }
        | null

      if (!response.ok) {
        throw new Error(body?.error || "Could not post your comment.")
      }
      if (!body?.data) {
        throw new Error("Could not post your comment.")
      }

      const nextTotal =
        typeof body.comments_count === "number" ? body.comments_count : total + 1

      /* Keep locally posted rows apart from the fetched pages: if the thread
         has unloaded pages, the new (newest) comment has to render after them,
         not between page one and page two. */
      setPostedComments((current) => [...current, body.data as AnnouncementComment])
      setTotal(nextTotal)
      setHasMore(comments.length + postedComments.length + 1 < nextTotal)
      onCountChange(nextTotal)
      setDraft("")
      stickToBottomRef.current = true
    } catch (failure) {
      setSubmitError(
        failure instanceof Error ? failure.message : "Could not post your comment."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const loadingFirstPage = loading && loadedPage === 0
  const canSubmit = draft.trim().length > 0 && !submitting && !loadingFirstPage
  const visibleComments = [...comments, ...postedComments]

  return (
    <div className="border-t border-outline-variant/25 bg-surface-container-low/40 px-4 pb-4 pt-3 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-[700] uppercase tracking-[0.24em] text-on-surface-variant">
          Comments
        </p>
        <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
          {total}
        </span>
      </div>

      <div ref={listRef} className="mt-2 max-h-80 overflow-y-auto overscroll-contain pr-1">
        {loading && visibleComments.length === 0 ? (
          <CommentSkeletons />
        ) : error && visibleComments.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[13px] leading-[19px] text-on-surface-variant">{error}</p>
            <button
              type="button"
              onClick={() => void loadPage(loadedPage + 1)}
              className="mt-2 text-[12px] font-[700] leading-[17px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Try again
            </button>
          </div>
        ) : visibleComments.length === 0 ? (
          <p className="py-6 text-center text-[13px] leading-[19px] text-on-surface-variant">
            No comments yet. Start the conversation.
          </p>
        ) : (
          <ul className="space-y-4">
            {visibleComments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} />
            ))}
          </ul>
        )}

        {error && visibleComments.length > 0 && (
          <p className="mt-3 text-center text-[12px] leading-[17px] text-error">{error}</p>
        )}

        {visibleComments.length > 0 && (
          <div className="flex justify-center py-3">
            {loading ? (
              <Spinner className="size-4 text-on-surface-variant" />
            ) : hasMore ? (
              <button
                type="button"
                onClick={() => void loadPage(loadedPage + 1)}
                className="text-[12px] font-[700] leading-[17px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Load more comments
              </button>
            ) : null}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-1 border-t border-outline-variant/25 pt-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Add a comment..."
            aria-label="Add a comment"
            disabled={submitting || loadingFirstPage}
            className="h-10 min-w-0 flex-1 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 text-[13px] leading-[18px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Post comment"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              !canSubmit && "cursor-not-allowed opacity-40 hover:bg-primary"
            )}
          >
            {submitting ? (
              <Spinner className="size-4" />
            ) : (
              <ArrowRight className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {submitError && (
          <p className="mt-2 text-[12px] leading-[17px] text-error" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </div>
  )
}

function CommentRow({ comment }: { comment: AnnouncementComment }) {
  const age = timeAgo(comment.created_at)
  const authorName = comment.author?.full_name ?? "Member"

  return (
    <li className="flex items-start gap-2.5">
      {comment.author?.avatar_url ? (
        <Image
          src={comment.author.avatar_url}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-7 shrink-0 rounded-full object-cover ring-1 ring-black/5"
        />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-fixed text-[10px] font-[700] leading-none text-on-primary-fixed-variant">
          {initialsOf(comment.author?.full_name)}
        </span>
      )}

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-[12px] font-[700] leading-[16px] text-on-surface">
            {authorName}
          </p>
          <time
            dateTime={comment.created_at}
            title={age.title}
            className="shrink-0 text-[10px] font-[500] leading-[14px] text-on-surface-variant"
          >
            {age.label}
          </time>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-[19px] text-on-surface">
          {comment.content}
        </p>
      </div>
    </li>
  )
}

function CommentSkeletons() {
  return (
    <div className="space-y-4 py-1" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex items-start gap-2.5">
          <span className="size-7 shrink-0 animate-pulse rounded-full bg-surface-container-high" />
          <div className="flex-1 space-y-1.5 pt-1">
            <span className="block h-2.5 w-24 animate-pulse rounded-full bg-surface-container-high" />
            <span className="block h-3 w-3/4 animate-pulse rounded-full bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  )
}
