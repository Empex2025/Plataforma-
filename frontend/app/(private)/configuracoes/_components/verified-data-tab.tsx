"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

import { FileDropzone } from "./file-dropzone"

const documentTypes = [
  { value: "cnh", label: "CNH", description: "Carteira Nacional de Habilitação" },
  { value: "rg", label: "RG", description: "Registro Geral" },
  { value: "outros", label: "Outros", description: "Documentos aceitos" },
]

const tips = [
  "Certifique-se de que todas as informações estejam visíveis.",
  "Evite reflexos, sombras e imagens borradas.",
]

export function VerifiedDataTab() {
  const [document, setDocument] = useState("cnh")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    toast.success("Documentos enviados para análise")
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Verificação de Documento
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="font-semibold">Qual documento você vai usar?</p>

            <div className="grid gap-4 sm:grid-cols-3">
              {documentTypes.map((doc) => (
                <Item
                  key={doc.value}
                  variant="outline"
                  render={
                    <button
                      type="button"
                      onClick={() => setDocument(doc.value)}
                    />
                  }
                  className={cn(
                    "items-start p-4",
                    document === doc.value
                      ? "border-2 border-info"
                      : "hover:bg-muted/50"
                  )}
                >
                  <ItemContent>
                    <ItemTitle className="text-base font-bold">
                      {doc.label}
                    </ItemTitle>
                    <ItemDescription>{doc.description}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </div>

            <ul className="flex flex-col gap-2 pt-2">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-5 shrink-0 text-success" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="font-bold">Envie seu documento</h4>
            <p className="text-sm text-muted-foreground">Frente</p>
            <FileDropzone />
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="font-bold">Envie seu documento</h4>
            <p className="text-sm text-muted-foreground">Verso</p>
            <FileDropzone />
          </div>
        </CardContent>

        <CardFooter className="justify-between">
          <p className="text-sm text-info">
            Certifique-se de salvar antes de sair desta página.
          </p>
          <Button type="submit">Enviar Documentos</Button>
        </CardFooter>
      </Card>
    </form>
  )
}
