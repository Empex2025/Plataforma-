"use client"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

type ProductsPaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function ProductsPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: ProductsPaginationProps) {
  const pages = Array.from(
    { length: Math.max(totalPages, 1) },
    (_, index) => index + 1
  )

  return (
    <div className="flex flex-col gap-3 pt-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {total} produto{total === 1 ? "" : "s"}
      </span>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent className="gap-2">
            {pages.map((item) => (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  isActive={item === page}
                  onClick={(event) => {
                    event.preventDefault()
                    onPageChange(item)
                  }}
                  className={cn(
                    "size-9 border border-muted-foreground",
                    item === page &&
                      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  )}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
