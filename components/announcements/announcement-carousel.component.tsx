"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils.util"
import type { AnnouncementImage } from "@/types/announcement.type"

/**
 * Full-bleed, swipeable image strip in the shape of an Instagram post.
 *
 * Native scroll-snap does the swiping, so touch and trackpad need no JS; the
 * dots only track which slide is centred. Arrows are desktop-only because a
 * hover-revealed control is unreachable on touch.
 */
export function AnnouncementCarousel({ images }: { images: AnnouncementImage[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function handleScroll() {
    const node = scroller.current
    if (!node) return

    const next = Math.min(
      images.length - 1,
      Math.max(0, Math.round(node.scrollLeft / node.clientWidth))
    )
    setActive((previous) => (previous === next ? previous : next))
  }

  function go(delta: number) {
    const node = scroller.current
    if (!node) return
    node.scrollBy({ left: delta * node.clientWidth, behavior: "smooth" })
  }

  return (
    <div className="group relative bg-surface-container">
      <div
        ref={scroller}
        onScroll={handleScroll}
        role="region"
        aria-label={images.length > 1 ? "Announcement images, swipe to browse" : "Announcement image"}
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-auto outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image) => (
          <a
            key={image.path}
            href={image.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${image.name} in a new tab`}
            className="relative aspect-square w-full shrink-0 snap-center lg:aspect-[3/2]"
          >
            <Image
              src={image.url}
              alt={image.name}
              fill
              unoptimized
              sizes="(min-width: 1280px) 820px, (min-width: 1024px) 680px, (min-width: 640px) 600px, 100vw"
              className="object-cover"
            />
          </a>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {active > 0 && (
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black shadow-sm transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          )}

          {active < images.length - 1 && (
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black shadow-sm transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          )}

          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {images.map((image, index) => (
              <span
                key={image.path}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  index === active ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
