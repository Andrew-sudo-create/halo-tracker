export interface UsageData {
  day: string
  daily_hits: number
  daily_cost: number
  accumulative_total: number
}

// Generate last 30 days of mock data
function generateMockData(): UsageData[] {
  const data: UsageData[] = []
  const today = new Date()
  let accumulativeTotal = 85

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    const dailyHits = Math.floor(Math.random() * 15) + 2
    const dailyCost = Number((dailyHits * 0.004 + Math.random() * 0.01).toFixed(3))
    accumulativeTotal += dailyHits

    data.push({
      day: date.toISOString().split('T')[0],
      daily_hits: dailyHits,
      daily_cost: dailyCost,
      accumulative_total: accumulativeTotal,
    })
  }

  return data
}

export const mockUsageData = generateMockData()

export function getTotalCost(data: UsageData[]): number {
  if (!data || data.length === 0) return 0
  const sum = data.reduce((sum, item) => sum + (item?.daily_cost ?? 0), 0)
  return isNaN(sum) ? 0 : sum
}

export function getTotalHits(data: UsageData[]): number {
  if (!data || data.length === 0) return 0
  const total = data[data.length - 1]?.accumulative_total ?? 0
  return isNaN(total) ? 0 : total
}

export function getAverageHitsPerDay(data: UsageData[]): number {
  if (!data || data.length === 0) return 0
  const total = data.reduce((sum, item) => sum + (item?.daily_hits ?? 0), 0)
  const avg = Math.round(total / data.length)
  return isNaN(avg) ? 0 : avg
}
