import Image from "next/image"

import { LojaContent } from "./_components/loja-content"

export default function LojaPage() {
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
        <LojaContent />
      </div>
    </div>
  )
}
