"use client"

import { Plus } from "lucide-react"

import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

import { useCategoriesTree } from "../../_hooks/use-categories-tree"
import { CategoryDialog } from "./category-dialog"
import CategoryItem from "./category-item"

export function CategoriesTree() {
  const { tree, isLoading, onRemove } = useCategoriesTree()

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Árvore de Categorias</h2>
        <CategoryDialog categories={tree}>
          <Button>
            <Plus className="size-4" />
            Nova Categoria
          </Button>
        </CategoryDialog>
      </div>

      {tree.length > 0 ? (
        <Accordion defaultValue={tree[0] ? [tree[0].id] : []}>
          <div className="flex flex-col gap-2">
            {tree.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                categories={tree}
                onRemove={onRemove}
              />
            ))}
          </div>
        </Accordion>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {isLoading
            ? "Carregando categorias..."
            : "Nenhuma categoria cadastrada."}
        </p>
      )}
    </div>
  )
}
