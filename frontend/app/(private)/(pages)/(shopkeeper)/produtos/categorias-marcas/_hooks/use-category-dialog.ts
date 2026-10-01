"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { categoriesApi, getErrorMessage, type Category } from "@/lib/api"

export const useCategoryDialog = (
  categories: Category[],
  category?: Category
) => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState("none")
  const [icon, setIcon] = useState("")

  const isEditing = Boolean(category)

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? "")
    setIcon(category?.icon ?? "")
    setParentId(category?.parentId ?? "none")
  }, [open, category])

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        icon: icon.trim() || undefined,
        parentId: parentId === "none" ? undefined : parentId,
      }
      return category
        ? categoriesApi.update(category.id, payload)
        : categoriesApi.create(payload)
    },

    onSuccess: () => {
      toast.success(isEditing ? "Categoria atualizada" : "Categoria criada")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setOpen(false)
    },

    onError: (err: Error) => {
      toast.error(
        getErrorMessage(
          err,
          isEditing ? "Erro ao atualizar categoria" : "Erro ao criar categoria"
        )
      )
    },
  })

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return {
    open,
    setOpen,
    name,
    setName,
    parentId,
    setParentId,
    icon,
    setIcon,
    isEditing,
    categoryItems: {
      none: "Nenhuma (categoria raiz)",
      ...Object.fromEntries(
        categories
          .filter((item) => item.id !== category?.id)
          .map((item) => [item.id, item.name])
      ),
    },
    onSubmit,
    isSaving: mutation.isPending,
  }
}
