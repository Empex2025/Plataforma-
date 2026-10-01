export type ProductAttributes = {
  sizes?: string[]
}

export type Product = {
  id: string
  companyId: string
  brandId: string | null
  name: string
  slug: string
  description: string | null
  sku: string | null
  barcode: string | null
  imageUrl: string | null
  images: string[]
  attributes: ProductAttributes | null
  status: string
  createdAt: string
  updatedAt: string
}

export type Paginated<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type CreateProductRequest = {
  name: string
  slug?: string
  description?: string
  sku?: string
  barcode?: string
  imageUrl?: string
  images?: string[]
  attributes?: ProductAttributes
  brandId?: string
}

export type UpdateProductRequest = {
  name?: string
  slug?: string
  description?: string
  sku?: string
  barcode?: string
  imageUrl?: string
  images?: string[]
  attributes?: ProductAttributes
  brandId?: string
}
