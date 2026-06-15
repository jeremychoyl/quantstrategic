"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, EquityPoint } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import StrategyCard from "@/components/StrategyModal"

const AnalysisChart = dynamic(() => import("@/components/AnalysisChart"), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex items-center justify-center text-sm animate-pulse"
         style={{ color: "var(--muted)" }}>Loading chart…</div>
  ),
})

type Period = "1W" | "1M" | "3M" | "YTD" | "ALL" | "CUSTOM"

function filterCurve(curve: EquityPoint[], period: Period, from: string, to: string): EquityPoint[] {
  const now = new Date()
  let start: Date
  switch (period) {
    case "1W":  start = new Date(now.getTime() - 7 * 86400000); break
    case "1M":  start = new Date(now.getTime() - 30 * 86400000); break
    case "3M":  start = new Date(now.getTime() - 90 * 86400000); break
    case "YTD": start = new Date(now.getFullYear(), 0, 1); break
    case "CUSTOM": {
      const f = new Date(from), t = new Date(to)
      return curve.filter(d => { const dt = new Date(d.date); return dt >= f && dt <= t })
    }
    default: return curve
  }
  return curve.filter(d => new Date(d.date) >= start)
}

function rebase(data: EquityPoint[], capital: number): EquityPoint[] {
  if (!data.length) return data
  return data.map(d => ({ ...d, combined_pct: (d.combined / capital) * 100 }))
}

export default function Analysis() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [capital, setCapital] = useState("25000")
  const [period, setPeriod]   = useState<Period>("YTD")
  const [from, setFrom]       = useState("2026-01-01")
  const [to, setTo]           = useState(new Date().toISOString().slice(0, 10))

  const load = useCallback(async () => {
    const d = await fetchDashboard()
    if (d) setData(d)
  }, [])

  useEffect(() => { load() }, [load])

  const cap      = parseFloat(capital.replace(/,/g, "")) || 25000
  const filtered = data ? filterCurve(data.oos_equity_curve, period, from, to) : []
  const rebased  = rebase(filtered, cap)
  const PERIODS: Period[] = ["1W", "1M", "3M", "YTD", "ALL", "CUSTOM"]

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <h1 className="text-xl font-black">Analysis</h1>

        <div className="rounded-xl p-5 space-y-4"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold">Configure View</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Capital ($)</label>
              <input value={capital} onChange={e => setCapital(e.target.value)}
                     className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                     style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                     placeholder="25000" />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>Period</label>
              <div className="flex gap-1 flex-wrap">
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                          className="px-2 py-1 rounded text-xs font-bold transition-colors"
                          style={{
                            background: period === p ? "var(--accent2)" : "var(--surface2)",
                            color: period === p ? "#fff" : "var(--muted)",
                            border: "1px solid var(--border)",
                          }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {period === "CUSTOM" && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>From</label>
                  <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                         className="w-full rounded-lg px-2 py-2 text-sm"
                         style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>To</label>
                  <input type="date" value={to} onChange={e => setTo(e.target.value)}
                         className="w-full rounded-lg px-2 py-2 text-sm"
                         style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                </div>
              </div>
            )}
          </div>

          {rebased.length > 0 && (
            <div className="mt-4">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-2xl font-black"
                      style={{ color: (rebased.at(-1)?.combined_pct ?? 0) >= 0 ? "var(--up)" : "var(--down)" }}>
                  {`${(rebased.at(-1)?.combined_pct ?? 0) >= 0 ? "+" : ""}${(rebased.at(-1)?.combined_pct ?? 0).toFixed(2)}%`}
                </span>
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  on ${cap.toLocaleString()} · {filtered.length} trading days
                </span>
              </div>
              <AnalysisChart data={rebased} />
            </div>
          )}

          {rebased.length === 0 && (
            <p className="text-sm mt-4" style={{ color: "var(--muted)" }}>No data for selected period</p>
          )}
        </div>

        {data && (
          <div>
            <h2 className="text-sm font-bold mb-3">Strategy Parameters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(data.strategies).map(([key, strat]) => (
                <StrategyCard key={key} strat={key} data={strat} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
