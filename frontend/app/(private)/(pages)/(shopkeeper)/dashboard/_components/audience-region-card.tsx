import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import { regions } from "../_data"

export function AudienceRegionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Público por Região</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {regions.map((region) => (
          <div key={region.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{region.name}</span>
              <span className="font-semibold tabular-nums">
                {(region.reach / 1000).toFixed(1)}K
              </span>
            </div>
            <Progress
              value={region.share}
              className="[&_[data-slot=progress-indicator]]:bg-secondary"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
