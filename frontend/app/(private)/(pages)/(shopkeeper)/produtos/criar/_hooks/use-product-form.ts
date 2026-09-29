"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  productSchema,
  type ProductFormData,
} from "../_schemas/product.schema"

export function useProductForm(defaultValues?: Partial<ProductFormData>) {
  const router = useRouter()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      category: "",
      salePrice: "",
      promoPrice: "",
      description: "",
      mainImage: null,
      secondaryImages: [],
      sizes: ["P", "M", "G"],
      ...defaultValues,
    },
  })

  function onSubmit(data: ProductFormData) {
    console.log("Product data:", data)
    toast.success("Produto salvo com sucesso!")
    router.push("/produtos")
  }

  function onCancel() {
    router.push("/produtos")
  }

  return { form, onSubmit, onCancel }
}
