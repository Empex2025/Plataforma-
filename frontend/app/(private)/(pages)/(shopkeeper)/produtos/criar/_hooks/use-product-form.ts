"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  brandsApi,
  categoriesApi,
  inventoryApi,
  pricesApi,
  productsApi,
  storesApi,
  uploadsApi,
  getErrorMessage,
} from "@/lib/api"
import { currencyToNumber } from "@/lib/utils"
import { usePrimaryCompany } from "@/hooks/use-primary-company"

import { productSchema, type ProductFormData } from "../_schemas/product.schema"

export function useProductForm(defaultValues?: Partial<ProductFormData>) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId } = usePrimaryCompany()

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", companyId],
    queryFn: () => brandsApi.list(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
    retry: false,
  })

  const { data: stores = [] } = useQuery({
    queryKey: ["stores", companyId],
    queryFn: () => storesApi.list(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  })

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      brandId: "",
      categoryId: "",
      salePrice: "",
      promoPrice: "",
      stock: "",
      images: [],
      sizes: ["P", "M", "G"],
      ...defaultValues,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!companyId) throw new Error("Empresa não encontrada")

      const imageUrls = await Promise.all(
        data.images.map((file) =>
          uploadsApi.image(file).then((response) => response.url)
        )
      )

      const product = await productsApi.create(companyId, {
        name: data.name,
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        description: data.description || undefined,
        imageUrl: imageUrls[0],
        images: imageUrls,
        attributes: { sizes: data.sizes },
        brandId: data.brandId || undefined,
      })

      if (data.categoryId) {
        await productsApi.addCategories(companyId, product.id, [data.categoryId])
      }

      const storeId = stores[0]?.id
      if (storeId) {
        const saleValue = currencyToNumber(data.salePrice)
        if (saleValue > 0) {
          await pricesApi.create(companyId, {
            storeId,
            productId: product.id,
            type: "REGULAR",
            value: saleValue,
          })
        }

        const promoValue = currencyToNumber(data.promoPrice ?? "")
        if (promoValue > 0) {
          await pricesApi.create(companyId, {
            storeId,
            productId: product.id,
            type: "PROMOTIONAL",
            value: promoValue,
          })
        }

        await inventoryApi.create(companyId, {
          storeId,
          productId: product.id,
          quantity: Number(data.stock.replace(/\D/g, "")) || 0,
        })
      }

      return product
    },

    onSuccess: () => {
      toast.success("Produto criado com sucesso")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      router.push("/produtos")
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao salvar produto"))
    },
  })

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    router.push("/produtos")
  }

  return {
    form,
    brands,
    categories,
    brandItems: {
      none: "Sem marca",
      ...Object.fromEntries(brands.map((brand) => [brand.id, brand.name])),
    },
    categoryItems: {
      none: "Sem categoria",
      ...Object.fromEntries(
        categories.map((category) => [category.id, category.name])
      ),
    },
    onSubmit,
    onCancel,
    isSaving: mutation.isPending,
  }
}
