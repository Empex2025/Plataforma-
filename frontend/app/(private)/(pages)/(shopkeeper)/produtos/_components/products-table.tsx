"use client"

import type { ProductListItem } from "../_hooks/use-products"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ProductRow } from "./product-row"

type ProductsTableProps = {
  items: ProductListItem[]
  isLoading?: boolean
  onDeactivate: (productId: string) => void
}

export function ProductsTable({
  items,
  isLoading,
  onDeactivate,
}: ProductsTableProps) {
  return (
    <div className="overflow-hidden border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary">
            <TableHead className="text-primary-foreground">Produto</TableHead>
            <TableHead className="text-primary-foreground">
              Preço Venda (R$)
            </TableHead>
            <TableHead className="text-primary-foreground">
              Estoque (un)
            </TableHead>
            <TableHead className="text-primary-foreground">Status</TableHead>
            <TableHead className="text-right text-primary-foreground">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onDeactivate={onDeactivate}
            />
          ))}

          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {isLoading
                  ? "Carregando produtos..."
                  : "Nenhum produto encontrado."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
