import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { trafficSources } from "../_data"

export function TrafficSourcesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Fontes de Tráfego</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {trafficSources.map((source) => (
          <div
            key={source.name}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>{source.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold tabular-nums">
                {source.visits.toLocaleString("pt-BR")}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {source.conversion}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
