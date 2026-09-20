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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "cn"

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
                  <Collapsible open={produtosOpen} onOpenChange={setProdutosOpen}>
                    <SidebarMenuButton
                      isActive={isProdutosActive}
                      tooltip="Produtos"
                      render={<Link href="/produtos" />}
                      onClick={() => setProdutosOpen(true)}
                    >
                      <Package />
                      <span>Produtos</span>
                    </SidebarMenuButton>

                    <SidebarMenuAction
                      onClick={() => setProdutosOpen((o) => !o)}
                      aria-label="Expandir Produtos"
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform",
                          produtosOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuAction>

                    <CollapsibleContent>
                      <ul className="mt-1 flex flex-col group-data-[collapsible=icon]:hidden">
                        {produtosSubItems.map((subItem, index) => {
                          const active = pathname.startsWith(subItem.url)
                          const isLast = index === produtosSubItems.length - 1

                          return (
                            <li key={subItem.url} className="relative pl-8">
                              <span
                                aria-hidden
                                className={cn(
                                  "absolute left-4 top-0 -translate-x-1/2 border-l border-dashed border border-primary",
                                  isLast ? "h-1/2" : "h-full"
                                )}
                              />
                              <span
                                aria-hidden
                                className="absolute left-4 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                              />
                              <SidebarMenuButton
                                isActive={active}
                                render={<Link href={subItem.url} />}
                              >
                                <span>{subItem.title}</span>
                              </SidebarMenuButton>
                            </li>
                          )
                        })}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
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
