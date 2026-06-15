import { DashboardData } from "./types"

const DATA_URL =
  "https://raw.githubusercontent.com/jeremychoyl/quantstrategic-data/main/dashboard.json"

export async function fetchDashboard(): Promise<DashboardData | null> {
  try {
    const url = `${DATA_URL}?t=${Date.now()}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    return res.json()
  } catch {
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
