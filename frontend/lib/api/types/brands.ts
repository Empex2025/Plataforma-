export type Brand = {
  id: string
  companyId: string
  name: string
  slug: string
  logoUrl: string | null
  createdAt: string
  updatedAt: string
}

export type CreateBrandRequest = {
  name: string
  slug?: string
  logoUrl?: string
}

export type UpdateBrandRequest = {
  name?: string
  slug?: string
  logoUrl?: string
}
