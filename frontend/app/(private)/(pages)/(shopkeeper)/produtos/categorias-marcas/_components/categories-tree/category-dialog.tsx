"use client"

import type { Category } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCategoryDialog } from "../../_hooks/use-category-dialog"
import { IconPicker } from "@/components/icon-picker"

type CategoryDialogProps = {
  categories: Category[]
  category?: Category
  children: React.ReactNode
}

export function CategoryDialog({
  categories,
  category,
  children,
}: CategoryDialogProps) {
  const {
    open,
    setOpen,
    name,
    setName,
    parentId,
    setParentId,
    icon,
    setIcon,
    isEditing,
    categoryItems,
    onSubmit,
    isSaving,
  } = useCategoryDialog(categories, category)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da categoria."
              : "Preencha os dados para criar uma nova categoria."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="category-name">
                Nome da Categoria *
              </label>
              <Input
                id="category-name"
                placeholder="Ex: Decoração"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="category-icon">
                Ícone
              </label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="category-parent">
              Categoria Pai
            </label>
            <Select
              value={parentId}
              onValueChange={(value) => setParentId(String(value))}
              items={categoryItems}
            >
              <SelectTrigger id="category-parent">
                <SelectValue placeholder="Nenhuma (categoria raiz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Nenhuma (categoria raiz)</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="mr-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
