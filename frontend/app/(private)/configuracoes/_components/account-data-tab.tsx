"use client"

import { maskCnpj, maskCpf } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useAccountData } from "../_hooks/use-account-data"
import { ConvertToPjDialog } from "./convert-to-pj-dialog"

export function AccountDataTab() {
  const { personType, form, update, onSave, isSaving, lastUpdate } =
    useAccountData()
  const isPf = personType === "PF"

  return (
    <form
      onSubmit={onSave}
      className="flex flex-col rounded-xl border bg-card p-6"
    >
      <h3 className="mb-6 text-base font-bold">Dados Gerais da loja</h3>

      {isPf ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="fullName">
              Nome completo
            </label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              placeholder="Digite seu nome..."
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
              onChange={(event) => update("email", event.target.value)}
              placeholder="nome@provedor.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="document">
              CPF
            </label>
            <div className="relative">
              <Input
                id="document"
                inputMode="numeric"
                value={form.document}
                onChange={(event) =>
                  update("document", maskCpf(event.target.value))
                }
                placeholder="000.000.000-00"
                className="pr-40"
              />
              <ConvertToPjDialog>
                <Button
                  type="button"
                  variant="link"
                  className="absolute top-1/2 right-3 -translate-y-1/2 p-0 font-semibold"
                >
                  Quero me tornar PJ
                </Button>
              </ConvertToPjDialog>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="rg">
                Documento de identidade (RG)
              </label>
              <Input
                id="rg"
                value={form.rg}
                onChange={(event) => update("rg", event.target.value)}
                placeholder="00.000.000-0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="storeName">
                Documentos empresariais
              </label>
              <Input
                id="storeName"
                value={form.storeName}
                onChange={(event) => update("storeName", event.target.value)}
                placeholder="Digite o Nome Fantasia..."
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="cnpj">
                CNPJ
              </label>
              <Input
                id="cnpj"
                inputMode="numeric"
                value={form.cnpj}
                onChange={(event) =>
                  update("cnpj", maskCnpj(event.target.value))
                }
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
                onChange={(event) => update("email", event.target.value)}
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
              onChange={(event) => update("razaoSocial", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="storeName">
              Nome Fantasia
            </label>
            <Input
              id="storeName"
              value={form.storeName}
              onChange={(event) => update("storeName", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="fullName">
              Nome do representante (Admin da conta)
            </label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Última alteração em {lastUpdate}
        </span>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  )
}
