"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import { Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type Brand = {
  id: string
  name: string
  productCount: number
}

const initialBrands: Brand[] = [
  { id: "1", name: "FENDI Home", productCount: 18 },
  { id: "2", name: "FENDI Home", productCount: 18 },
]

export function BrandsSection() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Gestão de Marcas</h2>
        <Button variant="secondary">
          <Plus className="size-4" />
          Nova Marca
        </Button>
      </div>
      <ul className="flex flex-col gap-3">
        {initialBrands.map((brand) => (
          <li
            key={brand.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                <ImageIcon className="size-6 text-muted-foreground" />
              </div>
              <div>
                <span className="font-medium">{brand.name}</span>
                <p className="text-sm text-muted-foreground">
                  {brand.productCount} produtos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm">
                <Pencil className="size-4" />
              </Button>
              <Button variant="destructive" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
