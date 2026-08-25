"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, MotionConfig, motion } from "motion/react"

type Phase = "running" | "finishing"

export function RouteProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<Phase>("running")
  const prevPath = useRef(pathname)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (prevPath.current === pathname) return
    prevPath.current = pathname

    if (timerRef.current !== null) window.clearTimeout(timerRef.current)

    setVisible(true)
    setPhase("running")

    timerRef.current = window.setTimeout(() => {
      setPhase("finishing")
      timerRef.current = null
    }, 500)
  }, [pathname])

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="route-progress"
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.1 } }}
          >
            <motion.div
              className="relative h-full w-full origin-left rounded-r-full bg-primary"
              initial={{ scaleX: 0 }}
              animate={phase === "running" ? { scaleX: 0.78 } : { scaleX: 1 }}
              transition={{
                duration: phase === "running" ? 0.5 : 0.22,
                ease: "easeOut",
              }}
              onAnimationComplete={() => {
                if (phase === "finishing") setVisible(false)
              }}
            >
              <span className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-primary to-transparent opacity-60" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
