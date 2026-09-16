import Link from "next/link"
import { Clock, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function PendingApproval() {
  return (
    <CardContent className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-secondary/20">
        <Clock className="size-8 text-secondary" />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-primary">
          Seu cadastro está em análise
        </h1>
        <p className="text-base text-muted-foreground">
          Nossa equipe está validando os seus dados comerciais para garantir a
          segurança da plataforma. Esse processo costuma levar de{" "}
          <span className="font-bold text-foreground">24 a 48 horas</span>.
        </p>
      </div>

      <Alert className="border-secondary/30 bg-secondary/10 text-left">
        <Info className="!size-4 text-secondary!" />
        <AlertDescription className="text-primary">
          Você receberá uma notificação em seu e-mail assim que sua loja for
          aprovada.
        </AlertDescription>
      </Alert>

      <Link href="/">
        <Button
          type="button"
          variant="outline"
          className="h-11 border-primary px-6 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
        >
          Voltar
        </Button>
      </Link>
    </CardContent>
  )
}
