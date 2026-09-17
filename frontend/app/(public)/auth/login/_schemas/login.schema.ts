import z from "zod"

export const loginSchema = z.object({
  document: z.string().min(11, "CPF ou CNPJ inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
})

export type LoginFormData = z.infer<typeof loginSchema>
