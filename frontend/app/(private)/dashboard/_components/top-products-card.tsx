import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { topProducts } from "../_data"

export function TopProductsCard() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Produtos Mais Acessados</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="flex flex-col">
          {topProducts.map((product, index) => (
            <li
              key={product.name}
              className="flex items-center gap-3 border-b py-3 last:border-b-0"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">
                  {product.views.toLocaleString("pt-BR")} visualizações
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="secondary" render={<Link href="/produtos" />}>
          Ver todos
        </Button>
      </CardFooter>
    </Card>
  )
}
