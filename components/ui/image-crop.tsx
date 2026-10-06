"use client"

import type { CSSProperties, ReactNode } from "react"
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop"

import "react-image-crop/dist/ReactCrop.css"

/** react-image-crop reads its chrome from CSS custom properties, so the
 *  selection outline and handles are retinted from the theme tokens rather
 *  than hardcoded per call site. */
const cropperVars: CSSProperties & Record<`--${string}`, string> = {
  "--rc-border-color": "var(--color-primary)",
  "--rc-focus-color": "var(--color-primary)",
  "--rc-drag-bar-size": "8px",
  "--rc-drag-handle-size": "14px",
  "--rc-drag-handle-mobile-size": "26px",
}

export function ImageCrop({
  crop,
  onChange,
  onComplete,
  aspect = 1,
  circularCrop = true,
  className,
  children,
}: {
  crop: Crop
  /** react-image-crop always emits display-space pixels, which is what
   *  cropToCanvas needs, so the percent form is only an initial value. */
  onChange: (crop: PixelCrop) => void
  onComplete?: (crop: PixelCrop) => void
  /** Width divided by height. Avatars use the default 1. */
  aspect?: number
  /** Renders the selection as a circle — only correct while aspect is 1. */
  circularCrop?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <ReactCrop
      crop={crop}
      onChange={onChange}
      onComplete={onComplete}
      aspect={aspect}
      circularCrop={circularCrop}
      ruleOfThirds
      keepSelection
      className={className}
      style={cropperVars}
    >
      {children}
    </ReactCrop>
  )
}
