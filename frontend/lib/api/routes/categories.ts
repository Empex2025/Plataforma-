import { apiFetch } from "../http"
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types"

export const categoriesApi = {
  list: () => apiFetch<Category[]>("/categories"),

  children: (categoryId: string) =>
    apiFetch<Category[]>(`/categories/${categoryId}/subcategories`),

  create: (data: CreateCategoryRequest) =>
    apiFetch<Category>("/categories", { method: "POST", body: data }),

  update: (categoryId: string, data: UpdateCategoryRequest) =>
    apiFetch<Category>(`/categories/${categoryId}`, {
      method: "PATCH",
      body: data,
    }),

  remove: (categoryId: string) =>
    apiFetch<{ success: boolean }>(`/categories/${categoryId}`, {
      method: "DELETE",
    }),
}
