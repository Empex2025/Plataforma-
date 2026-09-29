"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { Card } from "@/components/ui/card"
import {
  onboardingPath,
  useOnboardingState,
} from "@/lib/auth/use-onboarding-guard"
import { PendingApproval } from "./pending-approval"
import { StoreSetupForm } from "./form"

export function LojaContent() {
  const router = useRouter()
  const { data, isError, isSuccess } = useOnboardingState()

  useEffect(() => {
    if (isError) {
      router.replace("/auth/login")
      return
    }
    if (!isSuccess || !data) return

    if (data.step === "done") {
      router.replace("/dashboard")
      return
    }

    if (data.step !== "pending-approval" && data.step !== "store-setup") {
      router.replace(onboardingPath(data.step, data.personType))
    }
  }, [data, isError, isSuccess, router])

  if (!isSuccess || !data) return null

  if (data.step === "pending-approval") {
    return (
      <Card className="w-full max-w-xl p-10">
        <PendingApproval />
      </Card>
    )
  }

  if (data.step === "store-setup") {
    return (
      <Card className="w-full max-w-5xl p-10">
        <StoreSetupForm />
      </Card>
    )
  }

  return null
}
