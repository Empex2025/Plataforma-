"use client"

import { useState } from "react"
import {
  Controller,
  type Control,
  type FieldPath,
} from "react-hook-form"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { getErrorMessage, uploadsApi } from "@/lib/api"
import type { StoreSetupFormData } from "../../../_schemas/store-setup.schema"

type UploadFieldProps = {
  control: Control<StoreSetupFormData>
  name: FieldPath<StoreSetupFormData>
  label: string
  hint: string
  icon: LucideIcon
  className?: string
}

export function UploadField({
  control,
  name,
  label,
  hint,
  icon: Icon,
  className,
}: UploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-bold text-muted-foreground">
            {label}
          </Label>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary",
              isUploading && "pointer-events-none opacity-70",
              className
            )}
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isUploading}
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return

                setIsUploading(true)
                try {
                  const { url } = await uploadsApi.image(file)
                  field.onChange(url)
                } catch (error) {
                  toast.error(getErrorMessage(error, "Erro ao enviar a imagem"))
                } finally {
                  setIsUploading(false)
                }
              }}
            />
            <Icon className="size-6" />
            <span className="px-4 text-center text-sm">
              {isUploading
                ? "Enviando..."
                : field.value
                  ? "Imagem enviada"
                  : hint}
            </span>
          </label>
        </div>
      )}
    />
  )
}
