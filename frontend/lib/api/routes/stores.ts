import { apiFetch } from "../http"
import type {
  CreateStoreRequest,
  Store,
  StoreOnboardingRequest,
  UpdateStoreRequest,
} from "../types"

export const storesApi = {
  onboarding: (data: StoreOnboardingRequest) =>
    apiFetch<Store>("/stores/onboarding", { method: "POST", body: data }),

  list: (companyId: string) =>
    apiFetch<Store[]>("/stores", {
      headers: { "X-Company-Id": companyId },
    }),

  create: (companyId: string, data: CreateStoreRequest) =>
    apiFetch<Store>("/stores", {
      method: "POST",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),

  update: (storeId: string, data: UpdateStoreRequest, companyId: string) =>
    apiFetch<Store>(`/stores/${storeId}`, {
      method: "PATCH",
      body: data,
      headers: { "X-Company-Id": companyId },
    }),
}
