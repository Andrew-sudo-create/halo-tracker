"use client"

import React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  isLive?: boolean
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  isLive = false,
  className,
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  // Ensure value is never NaN
  const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value

  useEffect(() => {
    if (isLive && typeof safeValue === "number") {
      setIsAnimating(true)
      const timeout = setTimeout(() => setIsAnimating(false), 300)
      setDisplayValue(safeValue)
      return () => clearTimeout(timeout)
    }
    setDisplayValue(safeValue)
  }, [safeValue, isLive])

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground">{icon}</div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div
            className={cn(
              "text-2xl font-bold tracking-tight transition-all duration-300",
              isAnimating && "scale-105 text-chart-1"
            )}
          >
            {displayValue}
          </div>
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-1 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-chart-1" />
            </span>
          )}
        </div>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs",
              trend.isPositive ? "text-chart-2" : "text-destructive"
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}% from last period
          </p>
        )}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
