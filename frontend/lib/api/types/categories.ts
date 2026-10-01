export type Category = {
  id: string
  name: string
  slug: string
  icon: string | null
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateCategoryRequest = {
  name: string
  slug?: string
  icon?: string
  parentId?: string
}

export type UpdateCategoryRequest = {
  name?: string
  slug?: string
  icon?: string
  parentId?: string
}
