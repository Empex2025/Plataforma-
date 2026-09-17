"use client"

import { Line, LineChart } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

import type { Kpi } from "../_data"

const chartConfig = {
  value: { label: "Tendência" },
} satisfies ChartConfig

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const positive = kpi.delta >= 0
  const stroke = positive ? "#10b981" : "#ef4444"

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">{kpi.label}</span>
          <span className="text-2xl font-bold tracking-tight">{kpi.value}</span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge
            className={cn(
              "border-transparent",
              positive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
            )}
          >
            {positive ? "+" : ""}
            {kpi.delta}%
          </Badge>

          <ChartContainer config={chartConfig} className="aspect-auto h-12 w-24">
            <LineChart
              data={kpi.data}
              margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            >
              <Line
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
