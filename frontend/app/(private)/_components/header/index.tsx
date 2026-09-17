
import ProfileDropdown from "./dropdown-profile"
import { NotificationPopover } from "./notification-popover"
import { PageBreadcrumb } from "./page-breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"

const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <PageBreadcrumb />
        </div>

        <div className="flex items-center gap-2">
          <NotificationPopover />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header
