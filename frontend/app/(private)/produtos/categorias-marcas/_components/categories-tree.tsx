"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type Category = {
  id: string
  name: string
  children?: Category[]
}

const initialCategories: Category[] = [
  {
    id: "1",
    name: "Decoração",
    children: [
      { id: "1-1", name: "Vasos" },
      { id: "1-2", name: "Quadros" },
      { id: "1-3", name: "Espelhos" },
    ],
  },
  {
    id: "2",
    name: "Cozinha",
    children: [],
  },
  {
    id: "3",
    name: "Iluminação",
    children: [],
  },
]

function CategoryItem({ category }: { category: Category }) {
  const hasChildren = category.children && category.children.length > 0

  if (!hasChildren) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50">
        <span className="font-medium">{category.name}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm">
            <Pencil className="size-4" />
          </Button>
          <Button variant="destructive" size="icon-sm">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AccordionItem value={category.id} className="border-border">
      <div className="flex items-center justify-between rounded-lg border border-border transition-colors hover:bg-muted/50">
        <AccordionTrigger className="flex-1 px-4 py-3">
          {category.name}
        </AccordionTrigger>
        <div className="flex items-center gap-1 pr-4">
          <Button variant="outline" size="icon-sm">
            <Pencil className="size-4" />
          </Button>
          <Button variant="destructive" size="icon-sm">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <AccordionContent className="pl-6">
        <div className="flex flex-col gap-2 py-2">
          {category.children?.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">{child.name}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="destructive" size="icon-sm">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function CategoriesTree() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Árvore de Categorias</h2>
        <Button>
          <Plus className="size-4" />
          Nova Categoria
        </Button>
      </div>
      <Accordion type="multiple" defaultValue={["1"]}>
        <div className="flex flex-col gap-2">
          {initialCategories.map((category) => (
            <CategoryItem key={category.id} category={category} />
          ))}
        </div>
      </Accordion>
    </div>
  )
}
