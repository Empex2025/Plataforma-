import { useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm, type FieldPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { authApi, getErrorMessage, locationsApi } from "@/lib/api"
import { useOnboardingGuard } from "@/lib/auth/use-onboarding-guard"

import { completeSchema, type CompleteFormData } from "../_schemas/complete.schema"
import type { PersonType } from "../../_schemas/register.schema"

const COMPANY_FIELDS: FieldPath<CompleteFormData>[] = [
  "corporateName",
  "tradeName",
  "cnae",
  "fullAddress",
]

export const useCompleteForm = (type: PersonType) => {
  const router = useRouter()
  useOnboardingGuard("complete")

  const completeForm = useForm<CompleteFormData>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      type,
      step: 1,
      fullName: "",
      birthDate: "",
      zipCode: "",
      address: "",
      neighborhood: "",
      city: "",
      corporateName: "",
      tradeName: "",
      cnae: "",
      fullAddress: "",
      repFullName: "",
      repCpf: "",
      repBirthDate: "",
      repPhone: "",
      repAddress: "",
      repRole: "",
      repRelationship: "",
    },
  })

  const { watch, setValue, trigger } = completeForm

  const mutation = useMutation({
    mutationFn: (data: CompleteFormData) =>
      authApi.completeRegistration({
        type: data.type,
        fullName: data.fullName,
        corporateName: data.corporateName,
        tradeName: data.tradeName,
        cnae: data.cnae,
        fullAddress: data.fullAddress,
        repFullName: data.repFullName,
      }),

    onSuccess: () => {
      toast.success("Cadastro finalizado com sucesso")
      router.push("/auth/loja")
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao finalizar cadastro"))
    },
  })

  const step = watch("step")
  const zipCode = watch("zipCode") ?? ""
  const isCompanyStep = type === "PJ" && step === 1
  const isRepresentativeStep = type === "PJ" && step === 2

  useEffect(() => {
    const digits = zipCode.replace(/\D/g, "")
    if (digits.length !== 8) return

    let active = true
    locationsApi
      .cep(digits)
      .then((data) => {
        if (!active) return
        setValue("address", data.street, { shouldValidate: true })
        setValue("neighborhood", data.neighborhood, { shouldValidate: true })
        setValue("city", data.city, { shouldValidate: true })
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [zipCode, setValue])

  async function onNext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const valid = await trigger(COMPANY_FIELDS)
    if (valid) setValue("step", 2)
  }

  function onBack() {
    if (isRepresentativeStep) {
      setValue("step", 1)
      return
    }
    router.push(`/auth/verify?type=${type}`)
  }

  const onComplete = (data: CompleteFormData) => {
    mutation.mutate(data)
  }

  return {
    completeForm,
    onComplete,
    onNext,
    onBack,
    isLoading: mutation.isPending,
    isCompanyStep,
    isRepresentativeStep,
  }
}
