import { z } from "zod"

const fileSchema = z.custom<File>(
  (value) => typeof File !== "undefined" && value instanceof File,
  { message: "Arquivo inválido" }
)

export const productSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  salePrice: z.string().min(1, "Informe o preço de venda"),
  promoPrice: z.string().optional(),
  stock: z.string().min(1, "Informe o estoque"),
  images: z.array(fileSchema),
  sizes: z.array(z.string()).min(1, "Adicione pelo menos um tamanho"),
})

export type ProductFormData = z.infer<typeof productSchema>
