"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { UsageData } from "@/lib/mock-data"

interface ActivityTableProps {
  data: UsageData[]
}

export function ActivityTable({ data }: ActivityTableProps) {
  // Get last 10 entries, most recent first
  const recentData = [...data].reverse().slice(0, 10)

  const getActivityLevel = (hits: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (hits >= 12) return { label: "High", variant: "destructive" }
    if (hits >= 6) return { label: "Medium", variant: "default" }
    return { label: "Low", variant: "secondary" }
  }

  // Show empty state if no data
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your usage history for the last 10 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No usage data available yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Your usage history for the last 10 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Daily Hits</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentData.map((row, index) => {
              const activity = getActivityLevel(row?.daily_hits ?? 0)
              const key = row?.day ? `${row.day}-${index}` : `row-${index}`
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">
                    {row?.day ? new Date(row.day).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }) : "N/A"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row?.daily_hits ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${(row?.daily_cost ?? 0).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(row?.accumulative_total ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={activity.variant}>{activity.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
