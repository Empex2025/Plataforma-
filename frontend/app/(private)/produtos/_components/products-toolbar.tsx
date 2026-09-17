"use client"

import { useState } from "react"
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

import { categories, statuses } from "../_data"

export function ProductsToolbar() {
  const router = useRouter()
  const [category, setCategory] = useState("Todas")
  const [status, setStatus] = useState("Todos")

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input placeholder="Buscar produtos..." className="w-full sm:w-80" />

        <Select
          value={category}
          onValueChange={(value) => setCategory(String(value))}
        >
          <SelectTrigger className="w-48">
            <span className="text-muted-foreground">Categoria:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => setStatus(String(value))}
        >
          <SelectTrigger className="w-44">
            <span className="text-muted-foreground">Status:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statuses.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
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
