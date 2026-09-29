"use client"

import { Card } from "@/components/ui/card"
import { useLojaContent } from "../_hooks/use-loja-content"
import { PendingApproval } from "./pending-approval"
import { StoreSetupForm } from "./form"

export function LojaContent() {
  const { step, isReady } = useLojaContent()

  if (!isReady) return null

  if (step === "pending-approval") {
    return (
      <Card className="w-full max-w-xl p-10">
        <PendingApproval />
      </Card>
    )
  }

  if (step === "store-setup") {
    return (
      <Card className="w-full max-w-5xl p-10">
        <StoreSetupForm />
      </Card>
    )
  }

  return null
}
