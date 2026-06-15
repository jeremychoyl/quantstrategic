import { DashboardData } from "./types"

export async function fetchDashboard(): Promise<DashboardData | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data
  } catch {
    clearTimeout(timer)
    return null
  }
}

export function fmtPts(pts: number): string {
  return `${pts >= 0 ? "+" : ""}${pts.toFixed(1)} pts`
}

export function fmtUsd(usd: number): string {
  return `${usd >= 0 ? "+" : "-"}$${Math.abs(usd).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function fmtPct(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
}
