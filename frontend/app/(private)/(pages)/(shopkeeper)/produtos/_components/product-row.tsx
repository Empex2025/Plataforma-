"use client"

import {
  CheckCircle2,
  EllipsisVertical,
  Image as ImageIcon,
  Trash2,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { ProductListItem } from "../_hooks/use-products"

type ProductRowProps = {
  product: ProductListItem
  onDeactivate: (productId: string) => void
}

export function ProductRow({ product, onDeactivate }: ProductRowProps) {
  const active = product.status === "ACTIVE"
  const price =
    product.price !== null
      ? product.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "—"

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{product.name}</span>
            <span className="text-xs text-muted-foreground">
              {product.sku ?? "—"}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell className="text-muted-foreground">{price}</TableCell>

      <TableCell className="text-muted-foreground">{product.stock}</TableCell>

      <TableCell>
        {active ? (
          <Badge variant="success" className="gap-1 px-3 py-1">
            <CheckCircle2 strokeWidth={3} className="size-4" />
            Ativo
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1 px-3 py-1">
            <TriangleAlert strokeWidth={3} className="size-4" />
            Inativo
          </Badge>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Ações para ${product.name}`}
                />
              }
            >
              <EllipsisVertical strokeWidth={3} />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-40" align="end">
              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                onClick={() => onDeactivate(product.id)}
              >
                <Trash2 />
                Desativar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
