import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import Header from "./_components/header"
import AppSidebar from "./_components/sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export const dynamic = "force-dynamic"

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const hasSession =
    cookieStore.has("access_token") || cookieStore.has("refresh_token")

  if (!hasSession) {
    redirect("/auth/login")
  }

  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset className="layout-bg">
          <Header />
          <div className="flex-1 container mx-auto p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
