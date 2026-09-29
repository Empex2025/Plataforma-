"use client"

import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type ImageUploadProps = {
  label: string
  ratio: string
  url?: string | null
  onFile: (file: File | null) => void
}

export function ImageUpload({ label, ratio, url, onFile }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const shown = preview ?? url ?? null

  function handleFile(selected: File) {
    if (!selected.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas")
      return
    }
    setPreview(URL.createObjectURL(selected))
    onFile(selected)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  function removeFile() {
    setPreview(null)
    onFile(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        {label} ({ratio})
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected) handleFile(selected)
        }}
      />

      {shown ? (
        <div className="relative flex items-center justify-center rounded-lg border border-dashed bg-muted/50 p-4">
          <img
            src={shown}
            alt={`Preview ${label}`}
            className="max-h-32 rounded object-contain"
          />
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute top-2 right-2"
              onClick={removeFile}
            >
              <X />
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 bg-white hover:bg-muted/30"
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Arraste ou clique para selecionar
          </p>
        </button>
      )}
    </div>
  )
}
