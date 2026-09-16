"use client"

import {
  Controller,
  type Control,
  type FieldPath,
} from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import {
  WEEK_DAYS,
  type StoreSetupFormData,
} from "../../../_schemas/store-setup.schema"

type DaysFieldProps = {
  control: Control<StoreSetupFormData>
  name: FieldPath<StoreSetupFormData>
}

export function DaysField({ control, name }: DaysFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const days = Array.isArray(field.value) ? (field.value as string[]) : []

        return (
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {WEEK_DAYS.map((day) => (
              <label
                key={day}
                className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
              >
                <Checkbox
                  variant="outline"
                  checked={days.includes(day)}
                  onCheckedChange={(checked) =>
                    field.onChange(
                      checked
                        ? [...days, day]
                        : days.filter((value) => value !== day)
                    )
                  }
                />
                {day}
              </label>
            ))}
          </div>
        )
      }}
    />
  )
}
