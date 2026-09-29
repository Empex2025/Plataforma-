"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { authApi, type OnboardingStep, type PersonType } from "@/lib/api"

export const STEP_INDEX: Record<OnboardingStep, number> = {
  "verify-email": 0,
  "verify-phone": 1,
  complete: 2,
  "pending-approval": 3,
  "store-setup": 4,
  done: 5,
}

function pageOf(step: OnboardingStep): string {
  switch (step) {
    case "verify-email":
    case "verify-phone":
      return "/auth/verify"
    case "complete":
      return "/auth/register/complete"
    case "pending-approval":
    case "store-setup":
      return "/auth/loja"
    case "done":
      return "/dashboard"
  }
}

export function onboardingPath(
  step: OnboardingStep,
  personType: PersonType | null
): string {
  if (step === "complete") {
    return `/auth/register/complete?type=${personType === "PJ" ? "PJ" : "PF"}`
  }
  if (step === "store-setup") return "/auth/loja?status=approved"
  return pageOf(step)
}

export function useOnboardingState() {
  return useQuery({
    queryKey: ["onboarding-state"],
    queryFn: () => authApi.onboardingState(),
    retry: false,
    staleTime: 0,
  })
}

export function useOnboardingGuard(expected: OnboardingStep) {
  const router = useRouter()
  const { data, isError, isSuccess } = useOnboardingState()

  useEffect(() => {
    if (isError) {
      router.replace("/auth/login")
      return
    }
    if (!isSuccess || !data) return

    if (pageOf(data.step) !== pageOf(expected)) {
      router.replace(onboardingPath(data.step, data.personType))
    }
  }, [data, isError, isSuccess, expected, router])

  return data
}
