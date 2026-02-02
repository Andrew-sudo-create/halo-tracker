"use client"

import { useEffect, useState, useMemo } from "react"
import { Activity, Clock, CheckCircle2, XCircle, DollarSign, TrendingUp, AlertCircle, Search } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface ServiceData {
  service_name: string
  endpoint: string
  user_id: string
  total_hits: number
  success_count: number
  error_count: number
  avg_latency: number
  success_rate: string
  estimated_cost: number
  last_used: string
}

export function ApiServicesBreakdown() {
  const [services, setServices] = useState<ServiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<string>("total_hits")
  const [filterSuccessRate, setFilterSuccessRate] = useState<string>("all")

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/services`)
        if (!response.ok) throw new Error('Failed to fetch services data')
        const data = await response.json()
        setServices(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching services:', err)
        setError(err instanceof Error ? err.message : 'Failed to load services')
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
    // Refresh every 30 seconds
    const interval = setInterval(fetchServices, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filter, search, and sort services
  const filteredAndSortedServices = useMemo(() => {
    let filtered = services.filter(service => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        service.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.user_id.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Success rate filter
      const successRate = parseFloat(service.success_rate)
      const matchesSuccessRate = 
        filterSuccessRate === "all" ||
        (filterSuccessRate === "excellent" && successRate >= 95) ||
        (filterSuccessRate === "good" && successRate >= 80 && successRate < 95) ||
        (filterSuccessRate === "poor" && successRate < 80)
      
      return matchesSearch && matchesSuccessRate
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "total_hits":
          return b.total_hits - a.total_hits
        case "avg_latency":
          return a.avg_latency - b.avg_latency
        case "estimated_cost":
          return b.estimated_cost - a.estimated_cost
        case "success_rate":
          return parseFloat(b.success_rate) - parseFloat(a.success_rate)
        case "service_name":
          return a.service_name.localeCompare(b.service_name)
        default:
          return 0
      }
    })

    return filtered
  }, [services, searchQuery, sortBy, filterSuccessRate])

  if (loading && services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Services Breakdown</CardTitle>
          <CardDescription>Loading service usage data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Services Breakdown</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Services Breakdown</CardTitle>
          <CardDescription>Usage statistics by API service and endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No API services have been used yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Services Breakdown</CardTitle>
        <CardDescription>
          Detailed usage statistics for each API service and endpoint
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search services, endpoints, or user IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total_hits">Most Hits</SelectItem>
              <SelectItem value="avg_latency">Fastest</SelectItem>
              <SelectItem value="estimated_cost">Highest Cost</SelectItem>
              <SelectItem value="success_rate">Best Success Rate</SelectItem>
              <SelectItem value="service_name">Service Name</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSuccessRate} onValueChange={setFilterSuccessRate}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="excellent">≥95% Success</SelectItem>
              <SelectItem value="good">80-95% Success</SelectItem>
              <SelectItem value="poor">&lt;80% Success</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Total Hits</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
                <TableHead className="text-right">Avg Latency</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
                <TableHead>Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No services found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedServices.map((service, index) => {
                  const successRate = parseFloat(service.success_rate)
                  const key = `${service.service_name}-${service.endpoint}-${index}`
                  
                  return (
                    <Dialog key={key}>
                    <DialogTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Activity className="size-4 text-muted-foreground" />
                            {service.service_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {service.endpoint}
                          </code>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {service.total_hits.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm tabular-nums">{successRate}%</span>
                              {successRate >= 95 ? (
                                <CheckCircle2 className="size-4 text-green-600" />
                              ) : successRate >= 80 ? (
                                <Activity className="size-4 text-yellow-600" />
                              ) : (
                                <XCircle className="size-4 text-red-600" />
                              )}
                            </div>
                            <Progress value={successRate} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            <span className="text-sm tabular-nums">{service.avg_latency}ms</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="size-3 text-muted-foreground" />
                            <span className="text-sm tabular-nums">{service.estimated_cost.toFixed(4)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {new Date(service.last_used).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </TableCell>
                      </TableRow>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Activity className="size-5" />
                          {service.service_name}
                        </DialogTitle>
                        <DialogDescription>
                          Detailed metrics and performance data
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* User ID and Endpoint */}
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">User ID</h4>
                            <Badge variant="outline" className="text-xs">{service.user_id}</Badge>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Endpoint</h4>
                            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                              {service.endpoint}
                            </code>
                          </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                              <Activity className="size-3" />
                              <span className="text-xs font-medium">Total Requests</span>
                            </div>
                            <div className="text-xl font-bold">{service.total_hits.toLocaleString()}</div>
                          </div>

                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                              <Clock className="size-3" />
                              <span className="text-xs font-medium">Avg Latency</span>
                            </div>
                            <div className="text-xl font-bold">{service.avg_latency}ms</div>
                          </div>

                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                              <DollarSign className="size-3" />
                              <span className="text-xs font-medium">Est. Cost</span>
                            </div>
                            <div className="text-xl font-bold">${service.estimated_cost.toFixed(4)}</div>
                          </div>

                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                              <CheckCircle2 className="size-3" />
                              <span className="text-xs font-medium">Success Rate</span>
                            </div>
                            <div className="text-xl font-bold">{successRate}%</div>
                            <Progress value={successRate} className="h-1.5 mt-1.5" />
                          </div>
                        </div>

                        {/* Request Breakdown */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="size-3.5 text-green-600" />
                              <span className="text-xs font-medium">Successful</span>
                            </div>
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {service.success_count.toLocaleString()}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-2.5 bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <XCircle className="size-3.5 text-red-600" />
                              <span className="text-xs font-medium">Failed</span>
                            </div>
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {service.error_count.toLocaleString()}
                            </Badge>
                          </div>
                        </div>

                        {/* Last Activity */}
                        <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">Last Used</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(service.last_used).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Performance Status */}
                        {successRate < 95 && (
                          <div className="flex items-start gap-2 p-2.5 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                            <AlertCircle className="size-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">
                              Success rate below 95%. Consider investigating recent errors.
                            </p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )
              })
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filteredAndSortedServices.length} of {services.length} service(s)</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-green-600" />
              <span>≥95% success</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="size-3 text-yellow-600" />
              <span>80-95% success</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="size-3 text-red-600" />
              <span>&lt;80% success</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
