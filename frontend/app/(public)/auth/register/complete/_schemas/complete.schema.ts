import z from "zod"

import { personTypeSchema } from "../../_schemas/register.schema"

export const completeSchema = z
  .object({
    type: personTypeSchema,
    step: z.number(),
    // Pessoa Física
    fullName: z.string().optional(),
    birthDate: z.string().optional(),
    zipCode: z.string().optional(),
    address: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    // Empresa (PJ)
    corporateName: z.string().optional(),
    tradeName: z.string().optional(),
    cnae: z.string().optional(),
    fullAddress: z.string().optional(),
    // Representante da empresa (PJ)
    repFullName: z.string().optional(),
    repCpf: z.string().optional(),
    repBirthDate: z.string().optional(),
    repPhone: z.string().optional(),
    repAddress: z.string().optional(),
    repRole: z.string().optional(),
    repRelationship: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const require = (field: keyof typeof data, message: string) => {
      const value = data[field]
      if (typeof value !== "string" || value.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message })
      }
    }

    if (data.type === "PJ") {
      require("corporateName", "Informe a razão social")
      require("tradeName", "Informe o nome fantasia")
      require("cnae", "Informe o CNAE/atividade")
      require("fullAddress", "Informe o endereço completo")
      return
    }

    if (data.step === 1) {
      require("fullName", "Informe seu nome completo")
      require("birthDate", "Informe a data de nascimento")
      require("zipCode", "Informe o CEP")
      require("address", "Informe o endereço")
      require("neighborhood", "Informe o bairro")
      require("city", "Informe a cidade")
      return
    }

    require("repFullName", "Informe o nome completo")
    require("repCpf", "Informe o CPF")
    require("repBirthDate", "Informe a data de nascimento")
    require("repPhone", "Informe o telefone")
    require("repAddress", "Informe o endereço")
    require("repRole", "Informe o cargo/função")
    require("repRelationship", "Selecione uma opção")
  })

export type CompleteFormData = z.infer<typeof completeSchema>
