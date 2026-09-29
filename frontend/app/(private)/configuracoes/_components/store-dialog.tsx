"use client"

import type { Store } from "@/lib/api"
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
import { Separator } from "@/components/ui/separator"

import { useStoreDialog } from "../_hooks/use-store-dialog"
import { ImageUpload } from "./image-upload"

type StoreDialogProps = {
  store?: Store
  companyId?: string | null
  children: React.ReactNode
}

export function StoreDialog({ store, companyId, children }: StoreDialogProps) {
  const {
    open,
    setOpen,
    form,
    update,
    onSubmit,
    setLogoFile,
    setCoverFile,
    isSaving,
    isEditing,
    logoUrl,
    coverUrl,
  } = useStoreDialog(store, companyId ?? null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Loja" : "Nova Loja"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da loja."
              : "Preencha os dados para criar uma nova loja."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="store-name">
                Nome da loja
              </label>
              <Input
                id="store-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Ex: Loja da Esquina"
              />
            </div>

            <h4 className="text-sm font-bold">Endereço da loja</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="store-cep">
                  CEP
                </label>
                <Input
                  id="store-cep"
                  placeholder="00.000-000"
                  value={form.zipCode}
                  onChange={(event) => update("zipCode", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="store-endereco">
                  Endereço
                </label>
                <Input
                  id="store-endereco"
                  placeholder="Av. Paulista, 1578"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="store-complemento"
                >
                  Complemento
                </label>
                <Input
                  id="store-complemento"
                  placeholder="Sala 204"
                  value={form.complement}
                  onChange={(event) => update("complement", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="store-cidade-estado"
                >
                  Cidade/Estado
                </label>
                <Input
                  id="store-cidade-estado"
                  placeholder="São Paulo - SP"
                  value={form.cityState}
                  onChange={(event) => update("cityState", event.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold">Identidade Visual da Loja</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUpload
                label="Logo da Loja"
                ratio="Proporção 1:1"
                url={logoUrl}
                onFile={setLogoFile}
              />
              <ImageUpload
                label="Imagem de Capa"
                ratio="Proporção 16:9"
                url={coverUrl}
                onFile={setCoverFile}
              />
            </div>
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
