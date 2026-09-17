"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Badge,
  Bell,
  Check,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  Store,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Avaliações", url: "/avaliacoes", icon: Sparkles },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
]

export default function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="relative flex aspect-square size-9 items-center justify-center rounded-xl bg-linear-to-br from-secondary/90 to-white">
                <Badge
                  className="size-14 fill-secondary text-secondary"
                  strokeWidth={1.5}
                />
                <Check
                  className="absolute size-10 text-primary"
                  strokeWidth={2.5}
                />
              </div>
              <div className="flex flex-1 items-center group-data-[collapsible=icon]:hidden">
                <span className="truncate text-2xl font-bold text-primary">
                  Encontra<span className="text-secondary">Ê</span>
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active =
                  item.url === "/" ? pathname === "/" : pathname.startsWith(item.url)

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-1 px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <span>Suporte: suporte@lojista.com</span>
          <span>v1.4.2 stable</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
