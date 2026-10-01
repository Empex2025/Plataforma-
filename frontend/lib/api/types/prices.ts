export type PriceType = "REGULAR" | "PROMOTIONAL"

export type Price = {
  id: string
  storeId: string
  productId: string
  type: PriceType
  value: number
  validFrom: string | null
  validTo: string | null
  createdAt: string
  updatedAt: string
}

export type CreatePriceRequest = {
  storeId: string
  productId: string
  type?: PriceType
  value: number
  validFrom?: string
  validTo?: string
}
