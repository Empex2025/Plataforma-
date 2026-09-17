"use client"

import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

import { engagementData } from "../_data"

const chartConfig = {
  visualizacoes: { label: "Visualizações", color: "#2563eb" },
  cliques: { label: "Cliques", color: "#f59e0b" },
} satisfies ChartConfig

export function EngagementCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Engajamento da Loja (Visualizações vs Cliques)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <LineChart data={engagementData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="visualizacoes"
              type="monotone"
              stroke="var(--color-visualizacoes)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="cliques"
              type="monotone"
              stroke="var(--color-cliques)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
