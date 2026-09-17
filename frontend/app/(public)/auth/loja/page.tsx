import Image from "next/image"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { PendingApproval } from "./_components/pending-approval"
import { StoreSetupForm } from "./_components/form"

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { status } = await searchParams
  const approved = status === "approved"

  return (
    <div className="relative min-h-screen">
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
        <Card className={cn("w-full p-10", approved ? "max-w-5xl" : "max-w-xl")}>
          {approved ? <StoreSetupForm /> : <PendingApproval />}
        </Card>
      </div>
    </div>
  )
}
