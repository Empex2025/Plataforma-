import { apiFetch } from "../http"
import type { Store, StoreOnboardingRequest } from "../types"

export const storesApi = {
  onboarding: (data: StoreOnboardingRequest) =>
    apiFetch<Store>("/stores/onboarding", { method: "POST", body: data }),
}
