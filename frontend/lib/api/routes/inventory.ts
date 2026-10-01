import { apiFetch } from "../http"
import type {
  CreateInventoryRequest,
  Inventory,
  UpdateInventoryRequest,
} from "../types"

export const inventoryApi = {
  list: (companyId: string) =>
    apiFetch<Inventory[]>("/inventory", {
      headers: { "X-Company-Id": companyId },
    }),

  create: (companyId: string, data: CreateInventoryRequest) =>
    apiFetch<Inventory>("/inventory", {
      method: "POST",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),

  update: (
    companyId: string,
    productId: string,
    storeId: string,
    data: UpdateInventoryRequest
  ) =>
    apiFetch<Inventory>(`/inventory/${productId}/${storeId}`, {
      method: "PATCH",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),
}
