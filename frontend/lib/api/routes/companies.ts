import { apiFetch } from "../http"
import type {
  Company,
  UpdateCompanyRequest,
  UserCompanyMembership,
} from "../types"

export const companiesApi = {
  list: () => apiFetch<UserCompanyMembership[]>("/companies"),

  update: (companyId: string, data: UpdateCompanyRequest) =>
    apiFetch<Company>(`/companies/${companyId}`, {
      method: "PATCH",
      body: data,
    }),
}
