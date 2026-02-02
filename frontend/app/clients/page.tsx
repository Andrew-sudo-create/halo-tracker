"use client"

import { ClientsBreakdown } from "@/components/clients-breakdown"
import { DashboardHeader } from "@/components/dashboard-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function ClientsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex flex-1 flex-col gap-6 p-6">
          <DashboardHeader
            title="Clients"
            description="View all services and usage statistics grouped by client"
          />
          <ClientsBreakdown />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
