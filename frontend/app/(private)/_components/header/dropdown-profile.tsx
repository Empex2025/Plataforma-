"use client"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { CheckIcon, LogOutIcon, SettingsIcon, UserRound } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

const ProfileDropdown = ({
  defaultOpen,
  align = "end",
}: {
  defaultOpen?: boolean
  align?: "start" | "center" | "end"
}) => {
  const { user, userName, avatarUrl, logout } = useAuth()
  const router = useRouter()

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger nativeButton={false} render={<Avatar />}>
        {avatarUrl && (
          <AvatarImage
            src={avatarUrl}
            alt={userName}
            className="object-cover"
          />
        )}
        <AvatarFallback>
          <UserRound className="size-4" />
        </AvatarFallback>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align={align}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-4 px-4 py-2.5 font-normal">
            <div className="relative">
              <Avatar size="lg">
                {avatarUrl && (
                  <AvatarImage
                    src={avatarUrl}
                    alt={userName}
                    className="object-cover"
                  />
                )}
                <AvatarFallback>
                  <UserRound className="size-5" />
                </AvatarFallback>

                <AvatarBadge>
                  <CheckIcon />
                </AvatarBadge>
              </Avatar>
            </div>

            <div className="flex flex-1 flex-col items-start">
              <span className="text-lg font-semibold capitalize">
                {userName}
              </span>

              <span className="text-base text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 px-4 py-2.5 text-base"
          onClick={() => router.push("/settings/profile")}
        >
          <SettingsIcon className="size-5" />
          <span>Configurações</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="gap-2 px-4 py-2.5 text-base"
          onClick={() => {
            logout()
            router.push("/auth")
          }}
        >
          <LogOutIcon className="size-5" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileDropdown
