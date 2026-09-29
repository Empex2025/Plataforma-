import { apiUpload } from "../http"
import type { UploadResponse } from "../types"

export const uploadsApi = {
  image: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiUpload<UploadResponse>("/uploads/image", formData)
  },
}
