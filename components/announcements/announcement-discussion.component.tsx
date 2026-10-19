"use client"

import { useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { AnnouncementCommentButton } from "./announcement-comment-button.component"
import { AnnouncementComments } from "./announcement-comments.component"
import { AnnouncementLikeButton } from "./announcement-like-button.component"

/**
 * Owns the engagement row and the thread below the post.
 *
 * Both live here because opening the thread has to update the count on the
 * button, while the thread sits at the bottom of the card. The caption and
 * links arrive as children so that part stays server-rendered.
 */
export function AnnouncementDiscussion({
  batchId,
  announcementId,
  likeCount,
  commentCount,
  children,
}: {
  batchId: string
  announcementId: string
  likeCount: number
  commentCount: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [commentsCount, setCommentsCount] = useState(commentCount)
  const reduceMotion = useReducedMotion()
  const panelId = `announcement-comments-${announcementId}`

  return (
    <>
      <div className="flex items-center gap-6 px-4 pt-3 lg:px-6">
        <AnnouncementLikeButton
          batchId={batchId}
          announcementId={announcementId}
          likeCount={likeCount}
        />
        <AnnouncementCommentButton
          count={commentsCount}
          expanded={open}
          controls={panelId}
          onToggle={() => setOpen((current) => !current)}
        />
      </div>

      {children}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="comments"
            id={panelId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { height: 0, opacity: 0 }
            }
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }
            }
            className="overflow-hidden"
          >
            <AnnouncementComments
              batchId={batchId}
              announcementId={announcementId}
              initialCount={commentsCount}
              onCountChange={setCommentsCount}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
