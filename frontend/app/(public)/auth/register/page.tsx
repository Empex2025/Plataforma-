import Image from "next/image"
import { Card } from "@/components/ui/card"
import { RegisterForm } from "./_components/register-form"

export default function RegisterPage() {
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
          <RegisterForm />
        </Card>
      </div>
    </div>
  )
}
