"use client"

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

import { useConvertToPj } from "../_hooks/use-convert-to-pj"

export function ConvertToPjDialog({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    open,
    setOpen,
    cnpj,
    setCnpj,
    corporateName,
    setCorporateName,
    tradeName,
    setTradeName,
    onSubmit,
    isSubmitting,
  } = useConvertToPj()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quero me tornar PJ</DialogTitle>
          <DialogDescription>
            Informe o CNPJ e a razão social para converter sua conta em Pessoa
            Jurídica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="convert-cnpj">
              CNPJ
            </label>
            <Input
              id="convert-cnpj"
              value={cnpj}
              onChange={(event) => setCnpj(event.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="convert-corporate">
              Razão Social
            </label>
            <Input
              id="convert-corporate"
              value={corporateName}
              onChange={(event) => setCorporateName(event.target.value)}
              placeholder="Loja da Esquina LTDA"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="convert-trade">
              Nome Fantasia
            </label>
            <Input
              id="convert-trade"
              value={tradeName}
              onChange={(event) => setTradeName(event.target.value)}
              placeholder="Loja da Esquina"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !cnpj || !corporateName}
            >
              {isSubmitting ? "Convertendo..." : "Converter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
