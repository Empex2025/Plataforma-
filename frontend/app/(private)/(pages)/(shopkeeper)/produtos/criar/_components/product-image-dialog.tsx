"use client"

import {
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ImageAdjustment = {
  open: boolean
  pendingUrl: string | null
  rotation: number
  flipH: boolean
  flipV: boolean
  isProcessing: boolean
  rotate: (delta: number) => void
  toggleH: () => void
  toggleV: () => void
  confirm: () => void
  cancel: () => void
}

export function ProductImageDialog({
  image,
}: {
  image: ImageAdjustment
}) {
  const style =
    image.pendingUrl === null
      ? undefined
      : {
          transform: `rotate(${image.rotation}deg) scale(${
            image.flipH ? -1 : 1
          }, ${image.flipV ? -1 : 1})`,
        }

  return (
    <Dialog
      open={image.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) image.cancel()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajustar imagem</DialogTitle>
          <DialogDescription>
            Gire ou espelhe a imagem antes de usar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-4">
          {image.pendingUrl && (
            <img
              src={image.pendingUrl}
              alt="Ajuste da imagem"
              style={style}
              className="max-h-80 object-contain transition-transform duration-200"
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Girar à esquerda"
            onClick={() => image.rotate(-90)}
          >
            <RotateCcw />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Girar à direita"
            onClick={() => image.rotate(90)}
          >
            <RotateCw />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Espelhar horizontalmente"
            onClick={image.toggleH}
          >
            <FlipHorizontal />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Espelhar verticalmente"
            onClick={image.toggleV}
          >
            <FlipVertical />
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={image.cancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={image.confirm}
            disabled={image.isProcessing}
          >
            {image.isProcessing ? "Processando..." : "Adicionar imagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
