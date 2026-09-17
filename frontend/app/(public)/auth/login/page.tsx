import Image from "next/image"
import { Card } from "@/components/ui/card"
import { LoginForm } from "./_components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-10">
      <div className="absolute inset-0 z-0">
        <Image
          src="/background.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary-900/80" />
      </div>

      <div className="relative z-10 flex items-center justify-center">
        <Card className="absolute -left-4 -bottom-8 h-130 w-100  bg-secondary" />
        <Card className="relative flex w-110 flex-col items-start p-10">
          <LoginForm />
        </Card>
      </div>
    </div>
  )
}
