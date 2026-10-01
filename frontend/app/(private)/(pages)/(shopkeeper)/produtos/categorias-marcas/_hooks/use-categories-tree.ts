"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { categoriesApi, getErrorMessage, type Category } from "@/lib/api"

export type CategoryNode = Category & { children: Category[] }

export const useCategoriesTree = () => {
  const queryClient = useQueryClient()

  const { data: roots = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
    retry: false,
  })

  const { data: children = [] } = useQuery({
    queryKey: ["categories", "children", roots.map((root) => root.id)],
    queryFn: async () => {
      const lists = await Promise.all(
        roots.map((root) => categoriesApi.children(root.id))
      )
      return lists.flat()
    },
    enabled: roots.length > 0,
    retry: false,
  })

  const remove = useMutation({
    mutationFn: (categoryId: string) => categoriesApi.remove(categoryId),

    onSuccess: () => {
      toast.success("Categoria removida")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao remover categoria"))
    },
  })

  const tree: CategoryNode[] = roots.map((root) => ({
    ...root,
    children: children.filter((child) => child.parentId === root.id),
  }))

  return {
    tree,
    isLoading,
    onRemove: (categoryId: string) => remove.mutate(categoryId),
  }
}
