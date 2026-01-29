"use client"

import { useEffect, useState } from "react"
import { ChartLegendContent } from "@/components/ui/chart"

import { ChartLegend } from "@/components/ui/chart"

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { UsageData } from "@/lib/mock-data"

const chartConfig: ChartConfig = {
  daily_hits: {
    label: "Daily Hits",
    color: "hsl(221 83% 53%)",
  },
  accumulative_total: {
    label: "Accumulative Total",
    color: "hsl(142 71% 45%)",
  },
}

interface UsageChartProps {
  data: UsageData[]
}

export function UsageChart({ data }: UsageChartProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Format date for display - only after mount to prevent hydration mismatch
  const formattedData = data.map((item) => {
    if (!isMounted) {
      // Server-side: use simple date formatting
      const parts = item.day.split("-")
      const month = parseInt(parts[1])
      const day = parseInt(parts[2])
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return {
        ...item,
        formattedDay: `${months[month - 1]} ${day}`,
      }
    }
    // Client-side: use locale-aware formatting
    return {
      ...item,
      formattedDay: new Date(item.day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Overview</CardTitle>
        <CardDescription>
          Daily hits compared to accumulative total over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillDailyHits" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-daily_hits)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-daily_hits)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillAccumulative" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-accumulative_total)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-accumulative_total)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="formattedDay"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              width={50}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.day) {
                      return new Date(payload[0].payload.day).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        }
                      )
                    }
                    return ""
                  }}
                />
              }
            />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="daily_hits"
              name="daily_hits"
              stroke="var(--color-daily_hits)"
              fill="url(#fillDailyHits)"
              strokeWidth={2}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="accumulative_total"
              name="accumulative_total"
              stroke="var(--color-accumulative_total)"
              fill="url(#fillAccumulative)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
