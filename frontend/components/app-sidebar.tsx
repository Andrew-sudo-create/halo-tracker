"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  BarChart3,
  Home,
  Activity,
  Server,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navigationItems = [
  {
    title: "Overview",
    icon: Home,
    href: "/",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/analytics",
  },
  {
    title: "Activity",
    icon: Activity,
    href: "/activity",
  },
  {
    title: "Services",
    icon: Server,
    href: "/services",
  },
  {
    title: "Clients",
    icon: Users,
    href: "/clients",
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" suppressHydrationWarning>
      <SidebarHeader className="border-b border-sidebar-border" suppressHydrationWarning>
        <SidebarMenu suppressHydrationWarning>
          <SidebarMenuItem suppressHydrationWarning>
            <SidebarMenuButton size="lg" asChild suppressHydrationWarning>
              <Link href="/" suppressHydrationWarning>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BarChart3 className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Dashboard</span>
                  <span className="text-xs text-muted-foreground">Usage Analytics</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent suppressHydrationWarning>
        <SidebarGroup suppressHydrationWarning>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent suppressHydrationWarning>
            <SidebarMenu suppressHydrationWarning>
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.title} suppressHydrationWarning>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} suppressHydrationWarning>
                      <Link href={item.href} suppressHydrationWarning>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail suppressHydrationWarning />
    </Sidebar>
  )
}
