"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function NavMain({
  groups,
}: {
  groups: {
    title?: string
    items: {
      title: string
      url: string
      icon?: LucideIcon
      badge?: number
      subItems?: { title: string; url: string; badge?: number; icon?: LucideIcon }[]
    }[]
  }[]
}) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, index) => (
        <Collapsible
          key={group.title || index}
          asChild
          defaultOpen={true}
          className="group/collapsible"
        >
          <SidebarGroup className="p-0">
            {group.title && (
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="w-full justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-colors mt-2 mb-1 px-4 text-xs font-semibold text-muted-foreground">
                  {group.title}
                  <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent>
              <SidebarGroupContent className="px-2">
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname === item.url || pathname.startsWith(item.url + "/")

                    if (item.subItems && item.subItems.length > 0) {
                      return (
                        <Collapsible key={item.title} asChild defaultOpen={isActive}>
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.title}
                                className={cn("w-full justify-between focus:bg-sidebar-accent hover:bg-fuchsia-500/5 hover:text-fuchsia-600 dark:hover:text-fuchsia-400", isActive && "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 font-medium")}
                              >
                                <div className="flex items-center gap-2">
                                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                  <span>{item.title}</span>
                                </div>
                                <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90 shrink-0" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub className="mr-0 pr-0">
                                {item.subItems.map((subItem) => {
                                  const isSubActive = pathname === subItem.url
                                  return (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubActive}
                                        className={cn("justify-between px-2 hover:bg-fuchsia-500/5 hover:text-fuchsia-600 dark:hover:text-fuchsia-400", isSubActive && "font-medium text-fuchsia-600 dark:text-fuchsia-400")}
                                      >
                                        <Link href={subItem.url}>
                                          <div className="flex items-center gap-2">
                                            {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                                            <span>{subItem.title}</span>
                                          </div>
                                          {subItem.badge !== undefined && (
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                              {subItem.badge}
                                            </span>
                                          )}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  )
                                })}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      )
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.title}
                          isActive={isActive}
                          className={cn("justify-between hover:bg-fuchsia-500/5 hover:text-fuchsia-600 dark:hover:text-fuchsia-400", isActive && "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 font-medium")}
                        >
                          <Link href={item.url}>
                            <div className="flex items-center gap-2">
                              {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                              <span>{item.title}</span>
                            </div>
                            {item.badge !== undefined && (
                              <div className="ml-auto flex shrink-0 items-center justify-center rounded-sm bg-red-500 min-w-4 h-4 px-1 text-[10px] font-medium text-white shadow-sm ring-1 ring-white/20">
                                {item.badge}
                              </div>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </div>
  )
}
