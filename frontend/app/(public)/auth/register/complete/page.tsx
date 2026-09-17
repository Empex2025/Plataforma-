import Image from "next/image"
import { Card } from "@/components/ui/card"
import { CompleteForm } from "./_components/complete-form"
import type { PersonType } from "../_schemas/register.schema"

export default async function CompleteRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { type } = await searchParams
  const personType: PersonType = type === "PJ" ? "PJ" : "PF"

  return (
    <div className="relative min-h-screen bg-background">
      <div className="relative h-80">
        <Image
          src="/background.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary-900/80" />
      </div>

      <div className="relative z-10 -mt-20 flex justify-center px-6 pb-16">
        <Card className="w-full max-w-3xl p-10">
          <CompleteForm type={personType} />
        </Card>
      </div>
    </div>
  )
}
