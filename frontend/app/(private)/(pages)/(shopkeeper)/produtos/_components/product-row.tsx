"use client"

import {
  CheckCircle2,
  Copy,
  Download,
  Ellipsis,
  EllipsisVertical,
  Image as ImageIcon,
  Minus,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import { maskCurrency } from "@/lib/utils"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { Product } from "../_data"

type ProductRowProps = {
  product: Product
  onPriceChange: (id: string, price: string) => void
  onStockChange: (id: string, stock: number) => void
  onSave: (id: string) => void
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function ProductRow({
  product,
  onEdit,
  onDuplicate,
  onPriceChange,
  onStockChange,
  onSave,
  onDelete,
}: ProductRowProps) {
  const active = product.status === "active"


  return (
    <TableRow>

      <TableCell className="flex items-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ImageIcon />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{product.name}</span>
          <span className="text-xs text-muted-foreground">{product.sku}</span>
        </div>
      </TableCell>

      <TableCell className="text-muted-foreground">{product.segment}</TableCell>

      <TableCell>
        <Input
          value={product.price}
          onChange={(event) => onPriceChange(product.id, maskCurrency(event.target.value))}
          inputMode="decimal"
          className="w-32"
        />
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            className="bg-muted text-foreground hover:bg-muted/80"
            aria-label="Diminuir estoque"
            onClick={() => onStockChange(product.id, Math.max(0, product.stock - 1))}
          >
            <Minus />
          </Button>
          <Input
            value={product.stock}
            onChange={(event) =>
              onStockChange(
                product.id,
                Number(event.target.value.replace(/\D/g, "")) || 0
              )
            }
            inputMode="numeric"
            className="w-16 text-center"
          />
          <Button
            variant="outline"
            size="icon-sm"
            className="bg-muted text-foreground hover:bg-muted/80"
            aria-label="Aumentar estoque"
            onClick={() => onStockChange(product.id, product.stock + 1)}
          >
            <Plus />
          </Button>
        </div>
      </TableCell>

      <TableCell>
        {active ? (
          <Badge variant="success" className="text-sm py-4 px-2">
            <CheckCircle2 strokeWidth={3} className="size-4" />
            Ativo
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-sm py-4 px-2">
            <TriangleAlert strokeWidth={3} className="size-4" />
            Sem estoque
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

              <DropdownMenuItem className="gap-2" onClick={() => onDuplicate?.(product.id)}>
                <Copy />
                Duplicar
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2" onClick={() => onSave(product.id)}>
                <Save />
                Salvar
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2" onClick={() => onEdit?.(product.id)}>
                <Download />
                Exportar
              </DropdownMenuItem>

              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                onClick={() => onDelete(product.id)}
              >
                <Trash2 />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
