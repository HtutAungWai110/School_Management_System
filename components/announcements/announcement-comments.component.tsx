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

type OwnCommentPage = {
  data: AnnouncementComment[]
  total: number
}

type PendingComment = {
  id: string
  content: string
}

/**
 * The thread for one announcement.
 *
 * Two lists: the signed-in user's own comments, newest first, and everyone
 * else's, oldest first and paginated. They are fetched separately so the
 * user's row can sit at the top and appear immediately while it is posting.
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
  const [ownComments, setOwnComments] = useState<AnnouncementComment[]>([])
  const [comments, setComments] = useState<AnnouncementComment[]>([])
  const [loadedPage, setLoadedPage] = useState(0)
  const [total, setTotal] = useState(initialCount)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pendingComment, setPendingComment] = useState<PendingComment | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const commentsUrl = `/api/batches/${batchId}/announcement/${announcementId}/comments`

  const loadInitial = useCallback(async () => {
    if (loadingRef.current) return

    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const [ownResponse, otherResponse] = await Promise.all([
        fetch(`${commentsUrl}/mine`, { credentials: "include", cache: "no-store" }),
        fetch(`${commentsUrl}?page=1&limit=${PAGE_SIZE}`, {
          credentials: "include",
          cache: "no-store",
        }),
      ])

      if (!ownResponse.ok || !otherResponse.ok) {
        throw new Error("Comments request failed")
      }

      const ownBody = (await ownResponse.json()) as OwnCommentPage | null
      const otherBody = (await otherResponse.json()) as AnnouncementCommentPage | null

      const ownRows = Array.isArray(ownBody?.data) ? ownBody.data : []
      const otherRows = Array.isArray(otherBody?.data) ? otherBody.data : []
      const ownCount = typeof ownBody?.total === "number" ? ownBody.total : ownRows.length
      const otherCount =
        typeof otherBody?.total === "number" ? otherBody.total : otherRows.length
      const nextTotal = ownCount + otherCount

      setOwnComments(ownRows)
      setComments(otherRows)
      setLoadedPage(1)
      setTotal(nextTotal)
      setHasMore(Boolean(otherBody?.has_more))
      onCountChange(nextTotal)
    } catch {
      setError("Could not load comments. Check your connection and try again.")
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [commentsUrl, onCountChange])

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return

    const nextPage = loadedPage + 1
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

      setComments((current) => [...current, ...rows])
      setLoadedPage(nextPage)
      setHasMore(Boolean(body?.has_more))
    } catch {
      setError("Could not load comments. Check your connection and try again.")
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [commentsUrl, loadedPage])

  useEffect(() => {
    /* The requests write state after their responses resolve, not
       synchronously; the compiler's setState tracking does not model the
       await boundary. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitial()
  }, [loadInitial])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = draft.trim()
    if (!content || submitting || (loading && loadedPage === 0)) return

    const previousDraft = draft
    const previousTotal = total

    /* Show the row and count immediately; both are rolled back on failure. */
    setSubmitting(true)
    setSubmitError(null)
    setPendingComment({ id: `pending-${Date.now()}`, content })
    setDraft("")
    setTotal(previousTotal + 1)
    onCountChange(previousTotal + 1)

    /* The new row lives at the top of the thread; bring it into view. */
    if (listRef.current) listRef.current.scrollTop = 0

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
        typeof body.comments_count === "number" ? body.comments_count : previousTotal + 1

      setOwnComments((current) => [body.data as AnnouncementComment, ...current])
      setTotal(nextTotal)
      onCountChange(nextTotal)
      setPendingComment(null)
    } catch (failure) {
      /* The request did not commit, so remove the optimistic row and hand the
         text back to the composer. */
      setPendingComment(null)
      setDraft(previousDraft)
      setTotal(previousTotal)
      onCountChange(previousTotal)
      setSubmitError(
        failure instanceof Error ? failure.message : "Could not post your comment."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const loadingFirstPage = loading && loadedPage === 0
  const canSubmit = draft.trim().length > 0 && !submitting && !loadingFirstPage
  const hasAnyComments =
    ownComments.length > 0 || comments.length > 0 || pendingComment !== null
  const showOwnComments = ownComments.length > 0 || pendingComment !== null

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
        {loading && !hasAnyComments ? (
          <CommentSkeletons />
        ) : error && !hasAnyComments ? (
          <div className="py-6 text-center">
            <p className="text-[13px] leading-[19px] text-on-surface-variant">{error}</p>
            <button
              type="button"
              onClick={() => void loadInitial()}
              className="mt-2 text-[12px] font-[700] leading-[17px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Try again
            </button>
          </div>
        ) : !hasAnyComments ? (
          <p className="py-6 text-center text-[13px] leading-[19px] text-on-surface-variant">
            No comments yet. Start the conversation.
          </p>
        ) : (
          <>
            {showOwnComments && (
              <section aria-label="Your comments">

                <ul className="mt-2 mb-4 space-y-4">
                  {pendingComment && <PendingCommentRow content={pendingComment.content} />}
                  {ownComments.map((comment) => (
                    <CommentRow key={comment.id} comment={comment} />
                  ))}
                </ul>
              </section>
            )}


            {comments.length > 0 && (
              <ul className="space-y-4">
                {comments.map((comment) => (
                  <CommentRow key={comment.id} comment={comment} />
                ))}
              </ul>
            )}

            {error && (
              <p className="mt-3 text-center text-[12px] leading-[17px] text-error">{error}</p>
            )}

            {comments.length > 0 && (
              <div className="flex justify-center py-3">
                {loading ? (
                  <Spinner className="size-4 text-on-surface-variant" />
                ) : hasMore ? (
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    className="text-[12px] font-[700] leading-[17px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Load more comments
                  </button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-1 border-t border-outline-variant/25 pt-3">
        <div className="flex items-center gap-2">
          <input
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

function PendingCommentRow({ content }: { content: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-fixed">
        <Spinner className="size-3.5 text-primary" />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline gap-2">
          <p className="text-[12px] font-[700] leading-[16px] text-on-surface">You</p>
          <span className="text-[10px] font-[600] uppercase leading-[14px] tracking-[0.08em] text-primary">
            Posting
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-[19px] text-on-surface/70">
          {content}
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
