"use client"

import { useState } from "react"
import { toast } from "sonner"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ProductRow } from "./product-row"
import { products as initialProducts, type Product } from "../_data"

export function ProductsTable() {
  const [items, setItems] = useState<Product[]>(initialProducts)

  function updatePrice(id: string, price: string) {
    setItems((prev) =>
      prev.map((product) => (product.id === id ? { ...product, price } : product))
    )
  }

  function updateStock(id: string, stock: number) {
    setItems((prev) =>
      prev.map((product) => (product.id === id ? { ...product, stock } : product))
    )
  }

  function save(id: string) {
    toast.success("Produto salvo")
  }
  
  function edit(id: string) {
    toast.success("Produto editado")
  }

  function duplicateProduct(id: string) {
    toast.success("Produto duplicado")
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((product) => product.id !== id))
    toast.success("Produto removido")
  }

  return (
    <div className="overflow-hidden border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary">
            <TableHead className="text-primary-foreground">Produto</TableHead>
            <TableHead className="text-primary-foreground">Segmento</TableHead>
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
              onPriceChange={updatePrice}
              onStockChange={updateStock}
              onSave={save}
              onEdit={edit}
              onDuplicate={duplicateProduct}
              onDelete={remove}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
