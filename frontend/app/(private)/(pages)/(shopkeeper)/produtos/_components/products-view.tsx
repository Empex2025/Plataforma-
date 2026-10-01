"use client"

import { useProducts } from "../_hooks/use-products"
import { ProductsPagination } from "./products-pagination"
import { ProductsTable } from "./products-table"
import { ProductsToolbar } from "./products-toolbar"

export function ProductsView() {
  const {
    items,
    isLoading,
    page,
    setPage,
    total,
    totalPages,
    search,
    setSearch,
    status,
    setStatus,
    onDeactivate,
  } = useProducts()

  return (
    <div className="flex flex-col gap-4">
      <ProductsToolbar
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />
      <ProductsTable
        items={items}
        isLoading={isLoading}
        onDeactivate={onDeactivate}
      />
      <ProductsPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
