import z from "zod"

export const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const

export const scheduleBlockSchema = z.object({
  days: z.array(z.string()),
  start: z.string(),
  end: z.string(),
})

export const storeSetupSchema = z.object({
  zipCode: z.string(),
  address: z.string(),
  complement: z.string(),
  cityState: z.string(),
  logo: z.string().nullable(),
  cover: z.string().nullable(),
  schedules: z.array(scheduleBlockSchema),
  phone: z.string(),
  whatsapp: z.string(),
  instagram: z.string(),
})

export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>
export type StoreSetupFormData = z.infer<typeof storeSetupSchema>
