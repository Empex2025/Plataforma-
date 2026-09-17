"use client"

import {
  Controller,
  type Control,
  type FieldPath,
} from "react-hook-form"
import { Clock } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { StoreSetupFormData } from "../../../_schemas/store-setup.schema"

type TimeFieldProps = {
  control: Control<StoreSetupFormData>
  name: FieldPath<StoreSetupFormData>
}

export function TimeField({ control, name }: TimeFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <InputGroup className="h-[42px] w-36">
          <InputGroupAddon>
            <Clock />
          </InputGroupAddon>
          <InputGroupInput
            type="time"
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(e) => field.onChange(e.target.value)}
            className="[&::-webkit-calendar-picker-indicator]:hidden"
          />
        </InputGroup>
      )}
    />
  )
}
