"use client"

import type { Control } from "react-hook-form"

import { maskCep } from "@/lib/utils"
import { TextField } from "../fields/text-field"
import type { StoreSetupFormData } from "../../../_schemas/store-setup.schema"

export function AddressSection({
  control,
}: {
  control: Control<StoreSetupFormData>
}) {
  return (
    <div className="flex flex-col gap-4">
      <TextField
        control={control}
        name="zipCode"
        label="CEP"
        placeholder="00000-000"
        autoComplete="postal-code"
        mask={maskCep}
        wrapperClassName="sm:w-1/2"
      />
      <TextField
        control={control}
        name="address"
        label="Endereço"
        placeholder="Nome da rua"
        autoComplete="street-address"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          control={control}
          name="complement"
          label="Complemento"
          placeholder="Número, bloco, sala"
        />
        <TextField
          control={control}
          name="cityState"
          label="Cidade/Estado"
          placeholder="São Paulo-SP"
        />
      </div>
    </div>
  )
}
