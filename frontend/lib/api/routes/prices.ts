import { apiFetch } from "../http"
import type { CreatePriceRequest, Price } from "../types"

export const pricesApi = {
  create: (companyId: string, data: CreatePriceRequest) =>
    apiFetch<Price>("/prices", {
      method: "POST",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),

  list: (companyId: string) =>
    apiFetch<Price[]>("/prices", { headers: { "X-Company-Id": companyId } }),
}
