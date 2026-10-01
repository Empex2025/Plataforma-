"use client"

import { useEffect, useState } from "react"
import type { UseFormSetValue } from "react-hook-form"
import { toast } from "sonner"

import { transformImage } from "@/lib/image"
import type { ProductFormData } from "../_schemas/product.schema"

const MAX_IMAGES = 6

type GalleryItem = {
  id: string
  file: File
  preview: string
}

export function useProductImages(setValue: UseFormSetValue<ProductFormData>) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<File | null>(null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    setValue(
      "images",
      items.map((item) => item.file),
      { shouldValidate: true }
    )
  }, [items, setValue])

  const maxReached = items.length >= MAX_IMAGES

  function openWith(file: File) {
    if (maxReached) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens`)
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas")
      return
    }

    setPending(file)
    setPendingUrl(URL.createObjectURL(file))
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setOpen(true)
  }

  function rotate(delta: number) {
    setRotation((value) => (value + delta + 360) % 360)
  }

  function toggleH() {
    setFlipH((value) => !value)
  }

  function toggleV() {
    setFlipV((value) => !value)
  }

  async function confirm() {
    if (!pending) return

    setIsProcessing(true)
    try {
      const adjusted = await transformImage(pending, {
        rotation,
        flipH,
        flipV,
      })
      setItems((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          file: adjusted,
          preview: URL.createObjectURL(adjusted),
        },
      ])
      setOpen(false)
    } catch {
      toast.error("Não foi possível processar a imagem")
    } finally {
      setIsProcessing(false)
    }
  }

  function cancel() {
    setOpen(false)
  }

  function remove(id: string) {
    setItems((previous) => previous.filter((item) => item.id !== id))
  }

  return {
    items,
    maxReached,
    open,
    pendingUrl,
    rotation,
    flipH,
    flipV,
    isProcessing,
    openWith,
    rotate,
    toggleH,
    toggleV,
    confirm,
    cancel,
    remove,
  }
}
