"use client"

import { useEffect, useState } from "react"
import { Activity, Search, Filter, Download, ArrowUpDown } from "lucide-react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type UsageData } from "@/lib/mock-data"

type SortField = "day" | "daily_hits" | "daily_cost" | "accumulative_total"
type SortDirection = "asc" | "desc"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ActivityPage() {
  const [usageData, setUsageData] = useState<UsageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activityFilter, setActivityFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("day")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

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

  const getActivityLevel = (hits: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (hits >= 12) return { label: "High", variant: "destructive" }
    if (hits >= 6) return { label: "Medium", variant: "default" }
    return { label: "Low", variant: "secondary" }
  }

  // Filter and sort data
  const filteredData = usageData
    .filter((row) => {
      const matchesSearch = row.day.includes(searchQuery)
      const activity = getActivityLevel(row.daily_hits)
      const matchesFilter = activityFilter === "all" || activity.label.toLowerCase() === activityFilter
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      const modifier = sortDirection === "asc" ? 1 : -1
      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * modifier
      }
      return ((aValue as number) - (bValue as number)) * modifier
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const highActivityDays = usageData.filter(d => d.daily_hits >= 12).length
  const lowActivityDays = usageData.filter(d => d.daily_hits < 6).length
  const totalEntries = usageData.length

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Activity"
          description="Detailed activity log and history"
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <StatsCard
                title="Total Records"
                value={totalEntries}
                description="Days tracked"
                icon={<Activity className="size-4" />}
              />
              <StatsCard
                title="High Activity Days"
                value={highActivityDays}
                description={`${((highActivityDays / totalEntries) * 100).toFixed(0)}% of total`}
                icon={<Activity className="size-4" />}
                trend={{ value: 12, isPositive: true }}
              />
              <StatsCard
                title="Low Activity Days"
                value={lowActivityDays}
                description={`${((lowActivityDays / totalEntries) * 100).toFixed(0)}% of total`}
                icon={<Activity className="size-4" />}
              />
            </div>

            {/* Activity Log */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>
                      Complete history of all API usage
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 size-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by date (YYYY-MM-DD)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={activityFilter} onValueChange={setActivityFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="mr-2 size-4" />
                      <SelectValue placeholder="Filter by activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activity</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 h-8 data-[state=open]:bg-accent"
                            onClick={() => handleSort("day")}
                          >
                            Date
                            <ArrowUpDown className="ml-2 size-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-mr-3 h-8 data-[state=open]:bg-accent"
                            onClick={() => handleSort("daily_hits")}
                          >
                            Daily Hits
                            <ArrowUpDown className="ml-2 size-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-mr-3 h-8 data-[state=open]:bg-accent"
                            onClick={() => handleSort("daily_cost")}
                          >
                            Cost
                            <ArrowUpDown className="ml-2 size-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-mr-3 h-8 data-[state=open]:bg-accent"
                            onClick={() => handleSort("accumulative_total")}
                          >
                            Accumulative
                            <ArrowUpDown className="ml-2 size-4" />
                          </Button>
                        </TableHead>
                        <TableHead>Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No results found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((row) => {
                          const activity = getActivityLevel(row.daily_hits)
                          return (
                            <TableRow key={row.day}>
                              <TableCell className="font-medium">
                                {new Date(row.day).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.daily_hits}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                ${row.daily_cost.toFixed(3)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.accumulative_total.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant={activity.variant}>{activity.label}</Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  Showing {filteredData.length} of {usageData.length} entries
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
