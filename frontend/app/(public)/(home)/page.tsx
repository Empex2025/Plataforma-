

import { Suspense } from "react"

export default function EstoquePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent " />
        </div>
      }
    >
    </Suspense>
  )
}
