"use client"

import {
  Controller,
  type Control,
  type FieldPath,
} from "react-hook-form"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
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
              className
            )}
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) =>
                field.onChange(e.target.files?.[0]?.name ?? null)
              }
            />
            <Icon className="size-6" />
            <span className="px-4 text-center text-sm">
              {typeof field.value === "string" ? field.value : hint}
            </span>
          </label>
        </div>
      )}
    />
  )
}
