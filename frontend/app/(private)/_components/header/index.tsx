import Image from "next/image"
import ProfileDropdown from "./dropdown-profile"
import Link from "next/link"
import NavLinks from "./nav-links"
import { ModeToggle } from "@/components/mode-toggle"

const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-2 sm:px-6">
        <Link href="/">
          <Image src="/logo.png" alt="Chat-IA" width={80} height={80} />
        </Link>
        <NavLinks />

        <div className="flex items-center gap-2">
          <ModeToggle />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header
