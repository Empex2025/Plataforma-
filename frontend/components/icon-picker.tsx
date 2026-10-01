"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DynamicIcon } from "@/components/dynamic-icon"

export const CATEGORY_ICONS = [
  "House",
  "Store",
  "Building",
  "ShoppingCart",
  "ShoppingBag",
  "Package",
  "Boxes",
  "Tag",
  "Gift",
  "Shirt",
  "Footprints",
  "Gem",
  "Glasses",
  "Watch",
  "Handbag",
  "Backpack",
  "Sparkles",
  "Palette",
  "Brush",
  "PenTool",
  "Sofa",
  "Lamp",
  "Bed",
  "Bath",
  "Refrigerator",
  "WashingMachine",
  "AirVent",
  "Fan",
  "Tv",
  "Speaker",
  "Utensils",
  "Coffee",
  "Pizza",
  "Wine",
  "Cake",
  "Apple",
  "Carrot",
  "Beef",
  "Milk",
  "Dog",
  "Cat",
  "PawPrint",
  "Baby",
  "ToyBrick",
  "Dumbbell",
  "Bike",
  "Car",
  "Plane",
  "Smartphone",
  "Laptop",
  "Headphones",
  "Gamepad2",
  "Camera",
  "Book",
  "Wrench",
  "Hammer",
  "Scissors",
  "Heart",
  "Star",
  "Flower2",
  "Trees",
  "Leaf",
  "Sun",
  "Droplet",
  "Zap",
  "Umbrella",
  "KeyRound",
] as const

type IconPickerProps = {
  value: string
  onChange: (name: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return CATEGORY_ICONS
    return CATEGORY_ICONS.filter((name) => name.toLowerCase().includes(term))
  }, [query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Selecionar ícone"
            className="size-[42px] shrink-0"
          />
        }
      >
        {value ? (
          <DynamicIcon name={value} className="size-5" />
        ) : (
          <Plus className="size-5 text-muted-foreground" />
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-2">
        <Input
          placeholder="Buscar ícone..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mb-2"
        />

        <ScrollArea className="h-60">
          <div className="grid grid-cols-5 gap-1.5 pr-3">
            {filtered.map((name) => (
              <button
                key={name}
                type="button"
                aria-label={name}
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                }}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border border-transparent transition-colors hover:bg-muted",
                  value === name && "border-primary bg-primary/10 text-primary"
                )}
              >
                <DynamicIcon name={name} className="size-6" />
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="col-span-5 py-6 text-center text-xs text-muted-foreground">
                Nenhum ícone encontrado.
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
