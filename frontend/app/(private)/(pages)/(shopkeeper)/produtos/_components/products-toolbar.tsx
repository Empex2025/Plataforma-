"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
]

const STATUS_ITEMS: Record<string, string> = {
  all: "Todos",
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
}

type ProductsToolbarProps = {
  search: string
  status: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export function ProductsToolbar({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: ProductsToolbarProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar produtos..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full sm:w-80"
        />

        <Select
          value={status}
          onValueChange={(value) => onStatusChange(String(value))}
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-44">
            <span className="text-muted-foreground">Status:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={() => router.push("/produtos/criar")}>
        <Plus data-icon="inline-start" />
        Novo Produto
      </Button>
    </div>
  )
}
