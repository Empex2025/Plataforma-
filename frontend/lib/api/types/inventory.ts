export type Inventory = {
  id: string
  storeId: string
  productId: string
  quantity: number
  createdAt: string
  updatedAt: string
}

export type CreateInventoryRequest = {
  storeId: string
  productId: string
  quantity: number
}

export type UpdateInventoryRequest = {
  quantity: number
}
