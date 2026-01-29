"use client"

import { useEffect, useState } from "react"
import { Activity, TrendingUp, Zap } from "lucide-react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatsCard } from "@/components/stats-card"
import { LiveCostCounter } from "@/components/live-cost-counter"
import { UsageChart } from "@/components/usage-chart"
import { ActivityTable } from "@/components/activity-table"
import {
  getTotalCost,
  getTotalHits,
  getAverageHitsPerDay,
  type UsageData,
} from "@/lib/mock-data"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function DashboardPage() {
  const [usageData, setUsageData] = useState<UsageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/usage`)
        if (!response.ok) throw new Error('Failed to fetch usage data')
        const data = await response.json()
        setUsageData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const totalCost = getTotalCost(usageData)
  const totalHits = getTotalHits(usageData)
  const avgHitsPerDay = getAverageHitsPerDay(usageData)
  const todayHits = usageData[usageData.length - 1]?.daily_hits ?? 0

  // Ensure all values are valid numbers (not NaN)
  const safeFormattedTotalHits = loading ? "..." : (isNaN(totalHits) ? "0" : totalHits.toLocaleString())
  const safeFormattedTodayHits = loading ? "..." : (isNaN(todayHits) ? 0 : todayHits)
  const safeFormattedAvgHits = loading ? "..." : (isNaN(avgHitsPerDay) ? 0 : avgHitsPerDay)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Overview"
          description="Monitor your API usage and costs"
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-800">
                {error}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <LiveCostCounter initialCost={totalCost} />
              <StatsCard
                title="Total Hits"
                value={safeFormattedTotalHits}
                description="All-time accumulative"
                icon={<Zap className="size-4" />}
                trend={{ value: 12.5, isPositive: true }}
              />
              <StatsCard
                title="Today's Hits"
                value={safeFormattedTodayHits}
                description="Requests today"
                icon={<Activity className="size-4" />}
              />
              <StatsCard
                title="Avg. Daily Hits"
                value={safeFormattedAvgHits}
                description="Over last 30 days"
                icon={<TrendingUp className="size-4" />}
                trend={{ value: 8.2, isPositive: true }}
              />
            </div>

            {/* Chart */}
            <UsageChart data={usageData} />

            {/* Recent Activity Table */}
            <ActivityTable data={usageData} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
