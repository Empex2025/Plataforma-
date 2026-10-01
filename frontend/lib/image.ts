export type ImageTransform = {
  rotation: number
  flipH: boolean
  flipV: boolean
}

export async function transformImage(
  file: File,
  transform: ImageTransform
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const swap = transform.rotation % 180 !== 0
  const width = swap ? bitmap.height : bitmap.width
  const height = swap ? bitmap.width : bitmap.height

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) return file

  context.translate(width / 2, height / 2)
  context.rotate((transform.rotation * Math.PI) / 180)
  context.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1)
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  bitmap.close()

  const type = file.type.startsWith("image/") ? file.type : "image/png"
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), type, 0.92)
  )
  if (!blob) return file

  return new File([blob], file.name, { type: blob.type })
}
