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

// Dashboard-wide date display format: DD-MM-YYYY.
// Accepts an ISO date ("YYYY-MM-DD") or the date prefix of an ISO datetime
// ("YYYY-MM-DDTHH:MM..." / "YYYY-MM-DD HH:MM"). Anything else (e.g. a
// month-only "YYYY-MM" chart bucket, or already-formatted text) is returned
// unchanged so we never mangle values this helper doesn't own.
export function fmtDate(d?: string | null): string {
  if (!d) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})(?![-\d])/.exec(d)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d
}

// Same as fmtDate but preserves a trailing HH:MM time → "DD-MM-YYYY HH:MM".
export function fmtDateTime(d?: string | null): string {
  if (!d) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(d)
  return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : fmtDate(d)
}
