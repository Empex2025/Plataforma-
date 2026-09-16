"use client"

import { CircleCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useStoreSetup } from "../../_hooks/use-store-setup"
import { AddressSection } from "./sections/address-section"
import { ContactSection } from "./sections/contact-section"
import { IdentitySection } from "./sections/identity-section"
import { useRouter } from "next/navigation"

export function StoreSetupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { storeSetupForm, onStoreSetup, isLoading } = useStoreSetup()
  const { control, handleSubmit } = storeSetupForm
  const router = useRouter()

  return (
    <form
      className={cn("flex w-full flex-col gap-6", className)}
      onSubmit={handleSubmit(onStoreSetup)}
      {...props}
    >
      <CardContent className="flex flex-col gap-6 p-0">
        <h1 className="text-2xl font-bold text-primary">
          Configuração da Loja
        </h1>

        <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CircleCheck className="!size-4 text-emerald-600! dark:text-emerald-400!" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">
            Parabéns você foi aprovado! Agora cadastre sua loja para começar.
          </AlertDescription>
        </Alert>

        <AddressSection control={control} />

        <Separator />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <IdentitySection control={control} />
          <ContactSection control={control} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/")}
            className="h-11 border-primary px-6 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
          >
            Voltar
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 cursor-pointer px-8 font-semibold"
          >
            {isLoading ? "Enviando..." : "Concluir"}
          </Button>
        </div>
      </CardContent>
    </form>
  )
}
