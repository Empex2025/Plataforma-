"use client"

import type { Control } from "react-hook-form"
import { CircleX, ImagePlus } from "lucide-react"

import { UploadField } from "../fields/upload-field"
import type { StoreSetupFormData } from "../../../_schemas/store-setup.schema"

export function IdentitySection({
  control,
}: {
  control: Control<StoreSetupFormData>
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-base font-bold text-foreground">
        Identidade Visual da Loja
      </h2>
      <UploadField
        control={control}
        name="logo"
        label="Logo da Loja (Proporção 1:1)"
        hint="Upload Logo (PNG, JPG)"
        icon={ImagePlus}
        className="aspect-square"
      />
      <UploadField
        control={control}
        name="cover"
        label="Imagem de Capa (Proporção 16:9)"
        hint="Upload Capa"
        icon={CircleX}
        className="aspect-video"
      />
    </div>
  )
}
