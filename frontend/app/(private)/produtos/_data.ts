export type ProductStatus = "active" | "out_of_stock"

export type Product = {
  id: string
  name: string
  sku: string
  segment: string
  price: string
  stock: number
  status: ProductStatus
}

export const products: Product[] = [
  {
    id: "1",
    name: "Quadro Decorativo Abstrato",
    sku: "VS-MIN-01",
    segment: "Decoração",
    price: "120,00",
    stock: 24,
    status: "active",
  },
  {
    id: "2",
    name: "Quadro Decorativo Abstrato",
    sku: "VS-MIN-01",
    segment: "Decoração",
    price: "120,00",
    stock: 24,
    status: "out_of_stock",
  },
  {
    id: "3",
    name: "Quadro Decorativo Abstrato",
    sku: "VS-MIN-01",
    segment: "Decoração",
    price: "120,00",
    stock: 24,
    status: "active",
  },
  {
    id: "4",
    name: "Quadro Decorativo Abstrato",
    sku: "VS-MIN-01",
    segment: "Decoração",
    price: "120,00",
    stock: 24,
    status: "active",
  },
  {
    id: "5",
    name: "Quadro Decorativo Abstrato",
    sku: "VS-MIN-01",
    segment: "Decoração",
    price: "120,00",
    stock: 24,
    status: "active",
  },
]

export const categories = ["Todas", "Decoração", "Vestuário", "Alimentos"]

export const statuses = ["Todos", "Ativo", "Sem estoque"]

export const totalProducts = 42
