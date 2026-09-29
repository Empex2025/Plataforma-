"use client"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

type FileDropzoneProps = {
  accept?: string
  text?: string
  className?: string
  onFile?: (file: File) => void
}

export function FileDropzone({
  accept = "image/*",
  text = "Arraste e solte o arquivo aqui",
  className,
  onFile,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (accept.startsWith("image/") && !file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas")
      return
    }
    onFile?.(file)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/30 bg-muted/30 hover:bg-muted/50",
        className
      )}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected) handleFile(selected)
        }}
      />
      <Upload className="size-9 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}
