import { apiFetch } from "../http"
import type { CepResult } from "../types"

export const locationsApi = {
  cep: (cep: string) =>
    apiFetch<CepResult>(`/companies/cep/${encodeURIComponent(cep)}`),
}
