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

import { useManageStores } from "../_hooks/use-manage-stores"
import { StoreDialog } from "./store-dialog"

export function ManageStoresCard() {
  const { stores, companyId } = useManageStores()

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-bold">Gerenciar Lojas</h3>
        <StoreDialog companyId={companyId}>
          <Button variant="secondary" size="sm">
            <Plus className="size-4" />
            Loja
          </Button>
        </StoreDialog>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Alterne ou configure suas unidades registradas
      </p>

      <ItemGroup className="gap-2">
        {stores.map((store) => (
          <Item key={store.id} variant="outline">
            <ItemMedia
              className="bg-primary/10 text-info-foreground"
              variant="image"
            >
              <Building2 strokeWidth={2} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{store.name}</ItemTitle>
              <ItemDescription>
                {store.city ?? store.state ?? store.slug}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {store.status === "ACTIVE" && (
                <Badge variant="success">Ativa</Badge>
              )}
              <StoreDialog store={store} companyId={companyId}>
                <Button variant="outline" size="icon-sm">
                  <Settings />
                </Button>
              </StoreDialog>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>

      {stores.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nenhuma loja cadastrada ainda.
        </p>
      )}
    </div>
  )
}
