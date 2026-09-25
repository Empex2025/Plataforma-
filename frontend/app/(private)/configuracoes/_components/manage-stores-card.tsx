"use client"

import { Building2, Plus, Settings } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

import { stores } from "../_data"

export function ManageStoresCard() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-bold">Gerenciar Lojas</h3>
        <Button variant="secondary" size="sm">
          <Plus className="size-4" />
          Loja
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Alterne ou configure suas unidades registradas
      </p>

      <ItemGroup className="gap-2">
        {stores.map((store) => (
          <Item key={store.id} variant="outline">
            <ItemMedia variant="icon">
              <Building2 />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{store.name}</ItemTitle>
              <ItemDescription>{store.type}</ItemDescription>
            </ItemContent>
            <ItemActions>
              {store.active && (
                <Badge variant="success" className="px-2 py-0.5">
                  Ativa
                </Badge>
              )}
              <Button variant="outline" size="icon-sm">
                <Settings />
              </Button>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </div>
  )
}
