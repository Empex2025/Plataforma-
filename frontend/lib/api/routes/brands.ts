import { apiFetch } from "../http"
import type { Brand, CreateBrandRequest, UpdateBrandRequest } from "../types"

export const brandsApi = {
  list: (companyId: string) =>
    apiFetch<Brand[]>("/brands", { headers: { "X-Company-Id": companyId } }),

  create: (companyId: string, data: CreateBrandRequest) =>
    apiFetch<Brand>("/brands", {
      method: "POST",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),

  update: (companyId: string, brandId: string, data: UpdateBrandRequest) =>
    apiFetch<Brand>(`/brands/${brandId}`, {
      method: "PATCH",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),

  remove: (companyId: string, brandId: string) =>
    apiFetch<{ success: boolean }>(`/brands/${brandId}`, {
      method: "DELETE",
      headers: { "X-Company-Id": companyId },
    }),
}
