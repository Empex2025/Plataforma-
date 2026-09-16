import z from "zod"

export const verifyCodeSchema = z.object({
  code: z.string().length(6, "O código deve ter 6 dígitos"),
})

export type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>

export const verifyChannelSchema = z.enum(["email", "phone"])

export type VerifyChannel = z.infer<typeof verifyChannelSchema>
