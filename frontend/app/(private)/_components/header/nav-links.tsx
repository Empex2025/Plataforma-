"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  FileText,
  Shirt,
} from "lucide-react"

const links = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/lista", label: "NF-e", icon: FileText },
  { href: "/plussize", label: "Plussize", icon: Shirt },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
