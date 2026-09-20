import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Accordion,
} from "@/components/ui/accordion"
import { CategoryDialog } from "./category-dialog"
import CategoryItem from "./category-item"

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

export function CategoriesTree() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Árvore de Categorias</h2>
        <CategoryDialog categories={initialCategories}>
          <Button>
            <Plus className="size-4" />
            Nova Categoria
          </Button>
        </CategoryDialog>
      </div>
      <Accordion defaultValue={["1"]}>
        <div className="flex flex-col gap-2">
          {initialCategories.map((category) => (
            <CategoryItem key={category.id} category={category} />
          ))}
        </div>
      </Accordion>
    </div>
  )
}
