export type Company = {
  id: string
  name: string
  slug: string
  cnpj: string | null
  description: string | null
  logoUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type UserCompanyMembership = {
  company: Company
  role: string
}

export type UpdateCompanyRequest = {
  name?: string
  description?: string
  logoUrl?: string
}
