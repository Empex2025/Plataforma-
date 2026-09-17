import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

import { totalProducts } from "../_data"

const pages = [1, 2, 3]

export function ProductsPagination() {
  return (
    <div className="flex flex-col gap-3 pt-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>Mostrando 1–4 de {totalProducts} produtos</span>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent className="gap-2">
          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === 1}
                className={cn(
                  "size-9 border border-muted-foreground",
                  page === 1 &&
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90"
                )}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
        </PaginationContent>
      </Pagination>
    </div>
  )
}
