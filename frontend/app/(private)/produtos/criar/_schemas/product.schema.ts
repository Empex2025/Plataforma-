import { z } from "zod"

export const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  brand: z.string().min(1, "Marca é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
  salePrice: z.string().min(1, "Preço de venda é obrigatório"),
  promoPrice: z.string().optional(),
  description: z.string().optional(),
  mainImage: z.string().nullable().optional(),
  secondaryImages: z.array(z.string()).optional(),
  sizes: z.array(z.string()).min(1, "Adicione pelo menos um tamanho"),
})

export type ProductFormData = z.infer<typeof productSchema>
