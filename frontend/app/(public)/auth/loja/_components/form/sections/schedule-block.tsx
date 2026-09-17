"use client"

import type { Control } from "react-hook-form"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DaysField } from "../fields/days-field"
import { TimeField } from "../fields/time-field"
import type { StoreSetupFormData } from "../../../_schemas/store-setup.schema"

type ScheduleBlockProps = {
  control: Control<StoreSetupFormData>
  index: number
  onAdd: () => void
  showDivider?: boolean
}

export function ScheduleBlock({
  control,
  index,
  onAdd,
  showDivider,
}: ScheduleBlockProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-4",
        showDivider && "border-b border-dashed border-muted-foreground/30"
      )}
    >
      <DaysField control={control} name={`schedules.${index}.days`} />

      <div className="flex items-center gap-2">
        <TimeField control={control} name={`schedules.${index}.start`} />
        <span className="text-muted-foreground">-</span>
        <TimeField control={control} name={`schedules.${index}.end`} />
        <Button
          type="button"
          variant="secondary"
          onClick={onAdd}
          className="cursor-pointer gap-1.5 font-semibold"
        >
          <Plus data-icon="inline-start" strokeWidth={4} />
          Adicionar intervalo
        </Button>
      </div>
    </div>
  )
}
