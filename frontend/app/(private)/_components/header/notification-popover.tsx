"use client"

import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function NotificationPopover() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="text-muted-foreground rounded-full"
          />
        }
      >
        <Bell />
        <span className="sr-only">Notificações</span>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80">
        <div className="flex flex-col gap-2">
          <h5 className="font-semibold">Notificações</h5>
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma notificação nova.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
