"use client"

import { useFieldArray, type Control } from "react-hook-form"

import { maskPhone } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { TextField } from "../fields/text-field"
import { ScheduleBlock } from "./schedule-block"
import type { StoreSetupFormData } from "../../../_schemas/store-setup.schema"

export function ContactSection({
  control,
}: {
  control: Control<StoreSetupFormData>
}) {
  const { fields, insert } = useFieldArray({ control, name: "schedules" })

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-base font-bold text-foreground">
        Funcionamento e Contatos
      </h2>

      <div className="flex flex-col">
        <Label className="pb-3 text-sm font-bold text-muted-foreground">
          Horário de Funcionamento
        </Label>
        {fields.map((field, index) => (
          <ScheduleBlock
            key={field.id}
            control={control}
            index={index}
            onAdd={() =>
              insert(index + 1, { days: [], start: "", end: "" })
            }
            showDivider={index < fields.length - 1}
          />
        ))}
      </div>

      <TextField
        control={control}
        name="phone"
        label="Telefone Comercial"
        placeholder="(00) 00000-0000"
        autoComplete="tel"
        mask={maskPhone}
      />
      <TextField
        control={control}
        name="whatsapp"
        label="WhatsApp da Loja"
        placeholder="(00) 00000-0000"
        mask={maskPhone}
      />
      <TextField
        control={control}
        name="instagram"
        label="Instagram (@usuario ou link)"
        placeholder="@sualoja"
      />
    </div>
  )
}
