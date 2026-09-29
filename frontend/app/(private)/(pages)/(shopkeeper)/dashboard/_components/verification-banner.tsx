import Link from "next/link"
import { Info } from "lucide-react"

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"

export function VerificationBanner() {
  return (
    <Alert variant="warning">
      <Info />
      <AlertTitle>
        Falta pouco para você se tornar um lojista verificado.
      </AlertTitle>
      <AlertAction>
        <Link
          href="/configuracoes"
          className="text-sm text-primary font-semibold underline underline-offset-4"
        >
          Completar cadastro
        </Link>
      </AlertAction>
    </Alert>
  )
}
