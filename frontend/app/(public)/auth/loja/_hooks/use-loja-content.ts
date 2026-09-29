import { useEffect } from "react"
import { useRouter } from "next/navigation"

import {
  onboardingPath,
  useOnboardingState,
} from "@/lib/auth/use-onboarding-guard"

export const useLojaContent = () => {
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

  return {
    step: data?.step ?? null,
    isReady: isSuccess && Boolean(data),
  }
}
