"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Badge,
  Bell,
  Check,
  ChevronRight,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Avaliações", url: "/avaliacoes", icon: Sparkles },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
]

const produtosSubItems = [
  { title: "Categoria e Marcas", url: "/produtos/categorias-marcas" },
]

export default function AppSidebar() {
  const pathname = usePathname()
  const [produtosOpen, setProdutosOpen] = useState(() =>
    pathname.startsWith("/produtos")
  )

  const isProdutosActive =
    pathname === "/produtos" || pathname.startsWith("/produtos/")

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-center gap-4">
            <div className="relative flex aspect-square size-9 shrink-0 items-center justify-center rounded-2lg bg-linear-to-br from-secondary/90 to-white group-data-[collapsible=icon]:size-8">
              <Badge
                className="size-7 fill-secondary text-secondary group-data-[collapsible=icon]:size-6"
                strokeWidth={1.5}
              />
              <Check
                className="absolute size-4 text-primary group-data-[collapsible=icon]:size-3.5"
                strokeWidth={2.5}
              />
            </div>
            <div className="flex min-w-0 items-center group-data-[collapsible=icon]:hidden">
              <span className="truncate text-2xl font-bold text-primary">
                Encontra<span className="text-secondary">Ê</span>
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <Collapsible
                open={produtosOpen}
                onOpenChange={setProdutosOpen}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isProdutosActive}
                    tooltip="Produtos"
                    onClick={() => setProdutosOpen(!produtosOpen)}
                  >
                    <Package />
                    <span>Produtos</span>
                    <ChevronRight className="ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden data-[state=open]:rotate-90" />
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <CollapsibleContent>
                  {produtosSubItems.map((subItem) => {
                    const active = pathname.startsWith(subItem.url)

                    return (
                      <SidebarMenuItem
                        key={subItem.url}
                        className="ml-6 border-l border-dashed border-muted-foreground/30 pl-4"
                      >
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={subItem.title}
                          render={<Link href={subItem.url} />}
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>

              {items.map((item) => {
                const active =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url)

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
