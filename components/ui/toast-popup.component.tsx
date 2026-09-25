'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X, AlertCircle, CheckCircle } from 'lucide-react'

import { cn } from '@/lib/utils.util'

export function ToastPopup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message = searchParams.get('message')
  const [exiting, setExiting] = useState(false)

  const content = error || message
  const isError = !!error

  useEffect(() => {
    if (!content) return

    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        router.replace(pathname, { scroll: false })
      }, 300)
    }, 4000)

    return () => clearTimeout(timer)
  }, [content, pathname, router])

  if (!content) return null

  function handleClose() {
    setExiting(true)
    setTimeout(() => {
      router.replace(pathname, { scroll: false })
    }, 300)
  }

  return (
    <div
      className={cn(
        'fixed top-6 right-6 z-50 max-w-sm',
        exiting ? 'animate-out fade-out duration-300 motion-reduce:animate-none' : 'animate-in fade-in duration-300 motion-reduce:animate-none'
      )}
    >
      <div
        className={cn(
          'flex items-start gap-3 rounded-xl border p-4 shadow-lg',
          isError
            ? 'border-destructive/20 bg-destructive/10 text-destructive'
            : 'border-primary/20 bg-primary-fixed/40 text-on-primary-fixed-variant'
        )}
      >
        {isError ? (
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
        ) : (
          <CheckCircle className="mt-0.5 size-5 shrink-0" />
        )}
        <p className="text-sm leading-[19px]">{content}</p>
        <button
          type="button"
          aria-label="Close notification"
          onClick={handleClose}
          className="ml-auto shrink-0 text-current opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
