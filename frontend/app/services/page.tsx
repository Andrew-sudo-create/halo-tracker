"use client"

import { ApiServicesBreakdown } from "@/components/api-services-breakdown"
import { DashboardHeader } from "@/components/dashboard-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function ServicesPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex flex-1 flex-col gap-6 p-6">
          <DashboardHeader
            title="API Services"
            description="Monitor usage and performance of your API services and cloud functions"
          />
          <ApiServicesBreakdown />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
