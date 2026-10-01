"use client"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ChevronRight, Pencil, Trash2 } from "lucide-react"

import { DynamicIcon } from "@/components/dynamic-icon"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import type { Category } from "@/lib/api"

import type { CategoryNode } from "../../_hooks/use-categories-tree"
import { CategoryDialog } from "./category-dialog"

type CategoryItemProps = {
  category: CategoryNode
  categories: Category[]
  onRemove: (categoryId: string) => void
}

function CategoryActions({
  category,
  categories,
  onRemove,
}: {
  category: Category
  categories: Category[]
  onRemove: (categoryId: string) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <CategoryDialog categories={categories} category={category}>
        <Button variant="outline" size="icon-sm" aria-label="Editar categoria">
          <Pencil className="size-4" />
        </Button>
      </CategoryDialog>
      <ConfirmDeleteDialog
        description={`Excluir a categoria "${category.name}"? As subcategorias serão movidas para a raiz.`}
        onConfirm={() => onRemove(category.id)}
      >
        <Button variant="destructive" size="icon-sm" aria-label="Remover categoria">
          <Trash2 className="size-4" />
        </Button>
      </ConfirmDeleteDialog>
    </div>
  )
}

function CategoryLabel({ category }: { category: Category }) {
  return (
    <span className="flex items-center gap-2">
      {category.icon && <DynamicIcon name={category.icon} className="size-4" />}
      <span className="font-medium">{category.name}</span>
    </span>
  )
}

function CategoryItem({ category, categories, onRemove }: CategoryItemProps) {
  if (category.children.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
        <CategoryLabel category={category} />
        <CategoryActions
          category={category}
          categories={categories}
          onRemove={onRemove}
        />
      </div>
    )
  }

  return (
    <AccordionItem value={category.id}>
      <div className="flex items-center justify-between rounded-lg bg-muted">
        <AccordionTrigger className="flex-1 px-4 py-3 **:data-[slot=accordion-trigger-icon]:hidden">
          <div className="flex items-center gap-2">
            <ChevronRight
              strokeWidth={3}
              className="size-4 shrink-0 text-primary transition-transform group-aria-expanded/accordion-trigger:rotate-90"
            />
            <CategoryLabel category={category} />
          </div>
        </AccordionTrigger>
        <div className="pr-4">
          <CategoryActions
            category={category}
            categories={categories}
            onRemove={onRemove}
          />
        </div>
      </div>
      <AccordionContent className="pl-6">
        <div className="flex flex-col gap-2 py-2">
          {category.children.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between rounded-lg border-b px-4 py-3"
            >
              <CategoryLabel category={child} />
              <CategoryActions
                category={child}
                categories={categories}
                onRemove={onRemove}
              />
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export default CategoryItem
