"use client"

import { useState } from "react"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"

type Category = {
  id: string
  name: string
  children?: Category[]
}

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
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(category?.name ?? "")
  const [parentId, setParentId] = useState<string>("none")
  const [description, setDescription] = useState("")

  const isEditing = !!category

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    toast.success(isEditing ? "Categoria atualizada" : "Categoria criada")
    setOpen(false)
    resetForm()
  }

  function resetForm() {
    setName("")
    setParentId("none")
    setDescription("")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetForm()
      }}
    >
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
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
            <label className="text-sm font-medium" htmlFor="category-parent">
              Categoria Pai
            </label>
            <Select value={parentId} onValueChange={(value) => setParentId(String(value))}>
              <SelectTrigger id="category-parent">
                <SelectValue placeholder="Nenhuma (categoria raiz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Nenhuma (categoria raiz)</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="category-description">
              Descrição
            </label>
            <Textarea
              id="category-description"
              placeholder="Descrição opcional da categoria..."
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="mr-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
