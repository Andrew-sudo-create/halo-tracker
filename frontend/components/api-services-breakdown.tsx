"use client"

import { useEffect, useState } from "react"
import { Activity, Clock, CheckCircle2, XCircle, DollarSign } from "lucide-react"
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
import { Progress } from "@/components/ui/progress"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface ServiceData {
  service_name: string
  endpoint: string
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
              {services.map((service, index) => {
                const successRate = parseFloat(service.success_rate)
                const key = `${service.service_name}-${service.endpoint}-${index}`
                
                return (
                  <TableRow key={key}>
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
                )
              })}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {services.length} service(s)</span>
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
