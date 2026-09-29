"use client"

import { useState } from "react"
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
import { Separator } from "@/components/ui/separator"

import { ImageUpload } from "./image-upload"

type Store = {
  id: string
  name: string
  type: string
  active: boolean
}

type StoreDialogProps = {
  store?: Store
  children: React.ReactNode
}

export function StoreDialog({ store, children }: StoreDialogProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!store

  const [form, setForm] = useState({
    cep: "",
    endereco: "",
    complemento: "",
    cidadeEstado: "",
  })

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    toast.success(isEditing ? "Loja atualizada" : "Loja criada")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Loja" : "Nova Loja"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da loja."
              : "Preencha os dados para criar uma nova loja."}
          </DialogDescription>
        </DialogHeader>

          <form
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-bold">
                Endereço da loja
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="cep">
                    CEP
                  </label>
                  <Input
                    id="cep"
                    placeholder="00.000-000"
                    value={form.cep}
                    onChange={(e) => update("cep", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="endereco">
                    Endereço
                  </label>
                  <Input
                    id="endereco"
                    placeholder="Av. Paulista, 1578"
                    value={form.endereco}
                    onChange={(e) => update("endereco", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="complemento">
                    Complemento
                  </label>
                  <Input
                    id="complemento"
                    placeholder="Sala 204"
                    value={form.complemento}
                    onChange={(e) => update("complemento", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="cidadeEstado">
                    Cidade/Estado
                  </label>
                  <Input
                    id="cidadeEstado"
                    placeholder="São Paulo - SP"
                    value={form.cidadeEstado}
                    onChange={(e) => update("cidadeEstado", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-bold">
                Identidade Visual da Loja
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <ImageUpload label="Logo da Loja" ratio="Proporção 1:1" />
                <ImageUpload label="Imagem de Capa" ratio="Proporção 16:9" />
              </div>
            </div>
            </div>
          </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="mr-auto"
          >
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
