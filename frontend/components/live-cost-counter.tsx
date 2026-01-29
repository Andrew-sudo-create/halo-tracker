"use client"

import { useEffect, useState } from "react"
import { DollarSign } from "lucide-react"
import { StatsCard } from "./stats-card"

interface LiveCostCounterProps {
  initialCost: number
}

export function LiveCostCounter({ initialCost }: LiveCostCounterProps) {
  const [cost, setCost] = useState(initialCost)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Simulate live cost updates every 3-8 seconds
    const interval = setInterval(() => {
      const increment = Math.random() * 0.005 + 0.001
      setCost((prev) => Number((prev + increment).toFixed(4)))
    }, Math.random() * 5000 + 3000)

    return () => clearInterval(interval)
  }, [])

  // Prevent hydration mismatch - only show animated value after mount
  const displayCost = isMounted ? cost : initialCost

  return (
    <StatsCard
      title="Total Cost"
      value={`$${displayCost.toFixed(4)}`}
      description="Updated in real-time"
      icon={<DollarSign className="size-4" />}
      isLive
    />
  )
}
