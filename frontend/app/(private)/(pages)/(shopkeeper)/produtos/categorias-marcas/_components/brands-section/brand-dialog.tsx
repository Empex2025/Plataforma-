"use client"

import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Brand = {
  id: string
  name: string
  productCount: number
}

type BrandDialogProps = {
  brand?: Brand
  children: React.ReactNode
}

export function BrandDialog({ brand, children }: BrandDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(brand?.name ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!brand

  function handleFile(selected: File) {
    if (!selected.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas")
      return
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function removeFile() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    toast.success(isEditing ? "Marca atualizada" : "Marca criada")
    setOpen(false)
    resetForm()
  }

  function resetForm() {
    setName("")
    removeFile()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetForm()
      }}
    >
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Marca" : "Nova Marca"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da marca."
              : "Preencha os dados para criar uma nova marca."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="brand-name">
              Nome da Marca *
            </label>
            <Input
              id="brand-name"
              placeholder="Ex: FENDI Home"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Logo da Marca</label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0]
                if (selected) handleFile(selected)
              }}
            />

            {preview ? (
              <div className="relative flex items-center justify-center rounded-lg border border-dashed bg-muted/50 p-4">
                <img
                  src={preview}
                  alt="Preview do logo"
                  className="max-h-32 rounded object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-2 right-2"
                  onClick={removeFile}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 transition-colors ${isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/30 bg-white hover:bg-muted/30"
                  }`}
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="size-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">
                    Upload Logo (PNG, JPG)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Arraste ou clique para selecionar (Máx: 64X64px e 2MB)
                  </p>
                </div>
              </button>
            )}
          </div>

          <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="mr-auto"
              >
                Cancelar
              </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
