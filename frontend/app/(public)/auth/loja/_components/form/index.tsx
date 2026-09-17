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

        <Alert variant="success">
          <CircleCheck />
          <AlertDescription>
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
            variant="secondary"
            onClick={() => router.push("/")}
            size="lg"
          >
            Voltar
          </Button>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? "Enviando..." : "Concluir"}
          </Button>
        </div>
      </CardContent>
    </form>
  )
}
