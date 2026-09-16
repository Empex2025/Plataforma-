import z from "zod"

export const personTypeSchema = z.enum(["PF", "PJ"])

export type PersonType = z.infer<typeof personTypeSchema>

export const registerSchema = z.object({
  personType: personTypeSchema,
  document: z.string().min(11, "CPF ou CNPJ inválido"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
})

export type RegisterFormData = z.infer<typeof registerSchema>
