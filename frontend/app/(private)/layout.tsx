import Header from "./_components/header"

// Páginas privadas dependem de auth (client Supabase) — não pré-renderizar
// em build time. Sem isso, o prerender cria o client com env vazio no CI/Docker
// e o build falha com "@supabase/ssr: URL and API key are required".
export const dynamic = "force-dynamic"

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="layout-bg flex h-screen flex-col overflow-auto">
      <Header />
      <main className="flex-1 container mx-auto p-4">{children}</main>
    </div>
  )
}
