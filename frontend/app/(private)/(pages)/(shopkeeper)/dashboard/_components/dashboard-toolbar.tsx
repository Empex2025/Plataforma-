"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const periods = [
  { value: "30d", label: "Últimos 30 Dias (01/10 a 30/10)" },
  { value: "7d", label: "Últimos 7 Dias" },
  { value: "90d", label: "Últimos 90 Dias" },
]

export function DashboardToolbar() {
  const [period, setPeriod] = useState("30d")

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Filtrar Período:</span>
        <Select
          value={period}
          onValueChange={(value) => setPeriod(String(value))}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {periods.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Button>
        Exportar PDF/Excel
      </Button>
    </div>
  )
}
