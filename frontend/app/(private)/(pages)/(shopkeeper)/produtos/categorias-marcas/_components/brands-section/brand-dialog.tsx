"use client"

import { Upload, X } from "lucide-react"

import type { Brand } from "@/lib/api"
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

import { useBrandDialog } from "../../_hooks/use-brand-dialog"

type BrandDialogProps = {
  companyId: string | null
  brand?: Brand
  children: React.ReactNode
}

export function BrandDialog({ companyId, brand, children }: BrandDialogProps) {
  const {
    open,
    setOpen,
    name,
    setName,
    selectLogo,
    logoPreview,
    onSubmit,
    isSaving,
    isEditing,
  } = useBrandDialog(companyId, brand)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Marca" : "Nova Marca"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da marca."
              : "Preencha os dados para criar uma nova marca."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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

            {logoPreview ? (
              <div className="relative flex items-center justify-center rounded-lg border border-dashed bg-muted/50 p-4">
                <img
                  src={logoPreview}
                  alt="Preview do logo"
                  className="max-h-32 rounded object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-2 right-2"
                  onClick={() => selectLogo(null)}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 bg-white p-10 transition-colors hover:border-primary hover:bg-muted/30">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    selectLogo(event.target.files?.[0] ?? null)
                  }
                />
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="size-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">
                    Upload Logo (PNG, JPG)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Arraste ou clique para selecionar
                  </p>
                </div>
              </label>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="mr-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
