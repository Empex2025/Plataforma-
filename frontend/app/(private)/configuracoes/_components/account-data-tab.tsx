"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { accountData } from "../_data"
import { ManageStoresCard } from "./manage-stores-card"

export function AccountDataTab() {
  const [form, setForm] = useState({
    cnpj: accountData.cnpj,
    email: accountData.email,
    razaoSocial: accountData.razaoSocial,
    nomeFantasia: accountData.nomeFantasia,
    representante: accountData.representante,
  })

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    toast.success("Alterações salvas com sucesso")
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={handleSubmit} className="flex flex-col rounded-xl border bg-card p-6">
        <h3 className="mb-6 text-base font-bold">Dados Gerais da loja</h3>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="cnpj">
                CNPJ
              </label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => update("cnpj", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="email">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="razaoSocial">
              Razão Social
            </label>
            <Input
              id="razaoSocial"
              value={form.razaoSocial}
              onChange={(e) => update("razaoSocial", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="nomeFantasia">
              Nome Fantasia
            </label>
            <Input
              id="nomeFantasia"
              value={form.nomeFantasia}
              onChange={(e) => update("nomeFantasia", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="representante">
              Nome do representante (Admin da conta)
            </label>
            <Input
              id="representante"
              value={form.representante}
              onChange={(e) => update("representante", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Última alteração em {accountData.lastUpdate}
          </span>
          <Button type="submit">Salvar Alterações</Button>
        </div>
      </form>

      <ManageStoresCard />
    </div>
  )
}
