"use client"

import type * as React from "react"
import {
  UsersIcon,
  HashIcon,
  KeyIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  SmartphoneIcon,
  InboxIcon,
  MegaphoneIcon,
  LifeBuoyIcon,
  SettingsIcon,
  UserPlusIcon,
  ChevronsLeftIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin",
    email: "admin@kontak.app",
    avatar: "",
  },
  navMain: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboardIcon,
        },
        {
          title: "Inbox",
          url: "/inbox",
          icon: InboxIcon,
        },
      ],
    },
    {
      title: "Tools",
      items: [
        {
          title: "Messages",
          url: "/messages",
          icon: MessageSquareIcon,
        },
        {
          title: "Contacts",
          url: "/contacts",
          icon: UsersIcon,
        },
        {
          title: "Groups",
          url: "/groups",
          icon: HashIcon,
        },
        {
          title: "Broadcast",
          url: "/broadcast",
          icon: MegaphoneIcon,
        },
      ],
    },
    {
      title: "Settings",
      items: [
        {
          title: "Device Management",
          url: "/clients",
          icon: SmartphoneIcon,
        },
        {
          title: "API Key",
          url: "/api-key",
          icon: KeyIcon,
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Help Center",
      url: "#",
      icon: LifeBuoyIcon,
    },
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Invite teams",
      url: "#",
      icon: UserPlusIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar/50 backdrop-blur-md" {...props}>
      <SidebarHeader className="pt-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-transparent cursor-default"
            >
              <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 text-sidebar-primary-foreground shadow-sm">
                <MessageSquareIcon className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                <span className="truncate font-semibold text-base">Kontak <span className="text-muted-foreground font-normal italic">app</span></span>
                <span className="truncate text-xs text-muted-foreground">
                  admin.kontak.app
                </span>
              </div>
              <button 
                type="button"
                onClick={toggleSidebar}
                className="ml-auto rounded-md p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground transition-colors group-data-[collapsible=icon]:hidden"
              >
                <ChevronsLeftIcon className="size-4" />
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain groups={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="pb-4">
        <NavSecondary items={data.navSecondary} className="mt-auto" />
        <div className="px-2 pb-2">
          <NavUser user={data.user} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
