"use client"

import { useEffect, useState } from "react"
import { Users, Activity, DollarSign, TrendingUp, ChevronDown, ChevronRight } from "lucide-react"
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
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

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

interface ClientData {
  user_id: string
  total_services: number
  total_hits: number
  total_cost: number
  avg_success_rate: number
  services: ServiceData[]
}

export function ClientsBreakdown() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openClients, setOpenClients] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/services`)
        if (!response.ok) throw new Error('Failed to fetch services data')
        const data: ServiceData[] = await response.json()
        
        // Group services by user_id
        const clientMap = new Map<string, ServiceData[]>()
        data.forEach(service => {
          if (!clientMap.has(service.user_id)) {
            clientMap.set(service.user_id, [])
          }
          clientMap.get(service.user_id)!.push(service)
        })

        // Calculate aggregated client data
        const clientsData: ClientData[] = Array.from(clientMap.entries()).map(([user_id, services]) => {
          const total_hits = services.reduce((sum, s) => sum + s.total_hits, 0)
          const total_cost = services.reduce((sum, s) => sum + s.estimated_cost, 0)
          const avg_success_rate = services.reduce((sum, s) => sum + parseFloat(s.success_rate), 0) / services.length

          return {
            user_id,
            total_services: services.length,
            total_hits,
            total_cost,
            avg_success_rate,
            services: services.sort((a, b) => b.total_hits - a.total_hits)
          }
        }).sort((a, b) => b.total_hits - a.total_hits)

        setClients(clientsData)
        setError(null)
      } catch (err) {
        console.error('Error fetching clients:', err)
        setError(err instanceof Error ? err.message : 'Failed to load clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
    const interval = setInterval(fetchClients, 30000)
    return () => clearInterval(interval)
  }, [])

  const toggleClient = (userId: string) => {
    setOpenClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  if (loading && clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clients Overview</CardTitle>
          <CardDescription>Loading client data...</CardDescription>
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
          <CardTitle>Clients Overview</CardTitle>
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

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clients Overview</CardTitle>
          <CardDescription>No client data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No clients have used any services yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clients Overview</CardTitle>
        <CardDescription>
          All services grouped by client (User ID)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {clients.map((client) => {
          const isOpen = openClients.has(client.user_id)
          
          return (
            <Collapsible key={client.user_id} open={isOpen} onOpenChange={() => toggleClient(client.user_id)}>
              <Card className="border-2">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="size-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-5 text-muted-foreground" />
                        )}
                        <Users className="size-5" />
                        <div className="text-left">
                          <CardTitle className="text-lg">{client.user_id}</CardTitle>
                          <CardDescription className="text-xs">
                            {client.total_services} service{client.total_services !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm font-medium text-muted-foreground">Total Hits</div>
                          <div className="text-xl font-bold">{client.total_hits.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-muted-foreground">Total Cost</div>
                          <div className="text-xl font-bold">${client.total_cost.toFixed(4)}</div>
                        </div>
                        <div className="text-right min-w-[120px]">
                          <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xl font-bold">{client.avg_success_rate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Endpoint</TableHead>
                            <TableHead className="text-right">Hits</TableHead>
                            <TableHead className="text-right">Success Rate</TableHead>
                            <TableHead className="text-right">Latency</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {client.services.map((service, idx) => {
                            const successRate = parseFloat(service.success_rate)
                            return (
                              <TableRow key={idx}>
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
                                    <span className="text-sm tabular-nums">{successRate}%</span>
                                    <Progress value={successRate} className="h-1" />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {service.avg_latency}ms
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  ${service.estimated_cost.toFixed(4)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
        
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {clients.length} client{clients.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  )
}
