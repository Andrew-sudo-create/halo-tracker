const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface UsageData {
  day: string;
  daily_hits: number;
  daily_cost: number;
  accumulative_total: number;
}

export async function fetchUsageData(): Promise<UsageData[]> {
  try {
    const response = await fetch(`${API_URL}/api/usage`);
    if (!response.ok) throw new Error('Failed to fetch usage data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return [];
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
