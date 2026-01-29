"use client"

import { useEffect, useState } from "react"
import { BarChart3, TrendingUp, TrendingDown, Target, Calendar } from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatsCard } from "@/components/stats-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  getTotalCost,
  getTotalHits,
  getAverageHitsPerDay,
  type UsageData,
} from "@/lib/mock-data"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const barChartConfig: ChartConfig = {
  daily_hits: {
    label: "Daily Hits",
    color: "hsl(221 83% 53%)",
  },
  daily_cost: {
    label: "Daily Cost",
    color: "hsl(142 71% 45%)",
  },
  hits: {
    label: "Total Hits",
    color: "hsl(221 83% 53%)",
  },
}

export default function AnalyticsPage() {
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
  }, [])

  // Calculate distribution data dynamically
  const distributionData = [
    { name: "Low (1-5)", value: usageData.filter(d => d.daily_hits >= 1 && d.daily_hits <= 5).length, fill: "hsl(221 83% 53%)" },
    { name: "Medium (6-11)", value: usageData.filter(d => d.daily_hits >= 6 && d.daily_hits <= 11).length, fill: "hsl(142 71% 45%)" },
    { name: "High (12+)", value: usageData.filter(d => d.daily_hits >= 12).length, fill: "hsl(0 84% 60%)" },
  ]

  const totalCost = getTotalCost(usageData)
  const totalHits = getTotalHits(usageData)
  const avgHitsPerDay = getAverageHitsPerDay(usageData)
  
  // Calculate week over week change
  const lastWeekData = usageData.slice(-7)
  const previousWeekData = usageData.slice(-14, -7)
  const lastWeekHits = lastWeekData.reduce((sum, d) => sum + d.daily_hits, 0)
  const previousWeekHits = previousWeekData.reduce((sum, d) => sum + d.daily_hits, 0)
  const weekChange = previousWeekHits > 0 
    ? ((lastWeekHits - previousWeekHits) / previousWeekHits) * 100 
    : 0

  // Weekly aggregated data
  const weeklyData = []
  for (let i = 0; i < usageData.length; i += 7) {
    const week = usageData.slice(i, i + 7)
    const weekStart = week[0]?.day
    const weekHits = week.reduce((sum, d) => sum + d.daily_hits, 0)
    const weekCost = week.reduce((sum, d) => sum + d.daily_cost, 0)
    if (weekStart) {
      weeklyData.push({
        week: `Week ${Math.floor(i / 7) + 1}`,
        hits: weekHits,
        cost: Number(weekCost.toFixed(2)),
      })
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Analytics"
          description="Deep dive into your usage patterns"
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Weekly Avg"
                value={Math.round(lastWeekHits / 7)}
                description="Hits per day this week"
                icon={<Calendar className="size-4" />}
              />
              <StatsCard
                title="Week over Week"
                value={`${weekChange >= 0 ? "+" : ""}${weekChange.toFixed(1)}%`}
                description="Change from last week"
                icon={weekChange >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                trend={{ value: Math.abs(weekChange), isPositive: weekChange >= 0 }}
              />
              <StatsCard
                title="Peak Day"
                value={Math.max(...usageData.map(d => d.daily_hits), 0)}
                description="Highest daily hits"
                icon={<Target className="size-4" />}
              />
              <StatsCard
                title="Cost Efficiency"
                value={`$${(totalCost / totalHits * 1000).toFixed(2)}`}
                description="Per 1000 requests"
                icon={<BarChart3 className="size-4" />}
              />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Daily Hits Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Hits Distribution</CardTitle>
                  <CardDescription>
                    Request volume over the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                    <BarChart data={usageData} accessibilityLayer>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return date.toLocaleDateString("en-US", { day: "numeric" })
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => {
                              return new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }}
                          />
                        }
                      />
                      <Bar
                        dataKey="daily_hits"
                        name="daily_hits"
                        fill="var(--color-daily_hits)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Cost Trend Line Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Trend</CardTitle>
                  <CardDescription>
                    Daily cost progression
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                    <LineChart data={usageData} accessibilityLayer>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return date.toLocaleDateString("en-US", { day: "numeric" })
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => {
                              return new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }}
                            formatter={(value) => [`$${Number(value).toFixed(3)}`, "Cost"]}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="daily_cost"
                        name="daily_cost"
                        stroke="var(--color-daily_cost)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Summary</CardTitle>
                <CardDescription>
                  Aggregated weekly performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                  <BarChart data={weeklyData} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hits" name="hits" fill="var(--color-hits)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
