

"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils.util"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useSearchParams } from "next/navigation"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination.component"

type PageItem = number | "start-ellipsis" | "end-ellipsis"

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const items: PageItem[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) items.push("start-ellipsis")
  for (let i = start; i <= end; i++) items.push(i)
  if (end < totalPages - 1) items.push("end-ellipsis")
  items.push(totalPages)
  return items
}




interface PaginationNavProps {
  page: number
  totalPages: number
  className?: string
}

export function PaginationNav({ page, totalPages, className }: PaginationNavProps) {
  const path = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.get("search")
  const filter = searchParams.get("filter")
  const currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1))
  const items = getPageItems(currentPage, totalPages)
  const buildHref = (value: number) => {
    const params = new URLSearchParams()
    params.set("page", String(value))
    if (search) params.set("search", search)
    if (filter) params.set("filter", filter)
    return `${path}?${params.toString()}`
  }

  return (
    <Pagination className={cn("w-auto", className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            aria-disabled={currentPage <= 1}
            href={currentPage > 1 ? buildHref(currentPage - 1) : undefined}
            className={cn(
              "size-8 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-primary",
              currentPage <= 1 && "pointer-events-none opacity-50"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>

        {items.map((item) =>
          typeof item === "number" ? (
            <PaginationItem key={item}>
              <PaginationLink
                isActive={item === currentPage}
                href={buildHref(item)}
                className={cn(
                  "h-8 min-w-8 rounded px-3 text-[12px] font-[500] leading-[16px]",
                  item === currentPage
                    ? "border-0! bg-primary text-on-primary hover:bg-secondary hover:text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                )}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationEllipsis className="text-on-surface-variant" />
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationLink
            aria-disabled={currentPage >= totalPages}
            href={currentPage < totalPages ? buildHref(currentPage + 1) : undefined}
            className={cn(
              "size-8 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-primary",
              currentPage >= totalPages && "pointer-events-none opacity-50"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
