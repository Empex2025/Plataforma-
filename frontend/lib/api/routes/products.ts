import { apiFetch } from "../http"
import type {
  CreateProductRequest,
  Paginated,
  Product,
  UpdateProductRequest,
} from "../types"

export const productsApi = {
  list: (companyId: string, page = 1, limit = 10) =>
    apiFetch<Paginated<Product>>(`/products?page=${page}&limit=${limit}`, {
      headers: { "X-Company-Id": companyId },
    }),

  create: (companyId: string, data: CreateProductRequest) =>
    apiFetch<Product>("/products", {
      method: "POST",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),

  update: (companyId: string, productId: string, data: UpdateProductRequest) =>
    apiFetch<Product>(`/products/${productId}`, {
      method: "PATCH",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),

  deactivate: (companyId: string, productId: string) =>
    apiFetch<{ success: boolean }>(`/products/${productId}/deactivate`, {
      method: "POST",
      headers: { "X-Company-Id": companyId },
    }),

  addCategories: (companyId: string, productId: string, categoryIds: string[]) =>
    apiFetch<{ success: boolean }>(`/products/${productId}/categories`, {
      method: "POST",
      body: { categoryIds },
      headers: { "X-Company-Id": companyId },
    }),
}
