import { useEffect, useState } from "react"
import { useWatch, type Control, type FieldPath } from "react-hook-form"

import type { StoreSetupFormData } from "../_schemas/store-setup.schema"

export const useUploadField = (
  control: Control<StoreSetupFormData>,
  name: FieldPath<StoreSetupFormData>
) => {
  const value = useWatch({ control, name })
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!(value instanceof File)) {
      setPreview(null)
      return
    }

    const url = URL.createObjectURL(value)
    setPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [value])

  return preview
}
