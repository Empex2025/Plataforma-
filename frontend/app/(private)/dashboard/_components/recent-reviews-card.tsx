import Link from "next/link"
import { Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { recentReviews } from "../_data"

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "size-4",
            index < rating
              ? "fill-warning text-warning"
              : "text-muted-foreground"
          )}
        />
      ))}
    </div>
  )
}

export function RecentReviewsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliações Recentes</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {recentReviews.map((review) => (
          <div
            key={review.name}
            className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{review.name}</span>
              <span className="text-xs text-muted-foreground">
                {review.date}
              </span>
            </div>
            <Stars rating={review.rating} />
            <p className="text-sm text-muted-foreground">“{review.comment}”</p>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="secondary" render={<Link href="/avaliacoes" />}>
          Ver todos
        </Button>
      </CardFooter>
    </Card>
  )
}
