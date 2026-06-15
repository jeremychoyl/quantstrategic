"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { DashboardData, EquityPoint, PortfolioStats } from "@/lib/types"
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
type ComboKey = "ema" | "orb" | "overnight"

const COMBO_LABELS: Record<ComboKey, string> = {
  orb:       "ORB 30m",
  ema:       "EMA Cross 5m",
  overnight: "Overnight",
}

function comboStatsKey(selected: Set<ComboKey>): string {
  const order: ComboKey[] = ["ema", "orb", "overnight"]
  const parts = order.filter(k => selected.has(k))
  if (parts.length === 0) return "ema+orb"
  if (parts.length === 1) return parts[0]
  return parts.join("+")
}

function buildCombinedCurve(curve: EquityPoint[], selected: Set<ComboKey>): EquityPoint[] {
  return curve.map(pt => {
    let combined = 0
    if (selected.has("ema")) combined += pt.ema ?? 0
    if (selected.has("orb")) combined += pt.orb ?? 0
    if (selected.has("overnight")) combined += pt.overnight ?? 0
    return { ...pt, combined }
  })
}

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

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg px-4 py-3 flex flex-col gap-0.5"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-black" style={{ color: color ?? "var(--text)" }}>{value}</span>
    </div>
  )
}

function ComboStats({ stats }: { stats: PortfolioStats | undefined }) {
  if (!stats) return null
  const dd = stats.max_dd_usd
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
      <StatPill label="Profit Factor" value={stats.pf?.toFixed(2) ?? "—"}
                color={stats.pf >= 1.5 ? "var(--up)" : stats.pf >= 1.0 ? "#f59e0b" : "var(--down)"} />
      <StatPill label="Sharpe" value={stats.sharpe?.toFixed(2) ?? "—"}
                color={stats.sharpe >= 2 ? "var(--up)" : stats.sharpe >= 1 ? "#f59e0b" : "var(--down)"} />
      <StatPill label="Max DD" value={`-$${Math.abs(dd).toLocaleString()}`}
                color="var(--down)" />
      <StatPill label="Win %" value={`${stats.win_pct?.toFixed(1)}%`} />
      <StatPill label="Total pts" value={`+${stats.total_pts?.toFixed(1)}`}
                color={(stats.total_pts ?? 0) >= 0 ? "var(--up)" : "var(--down)"} />
      <StatPill label="Total $" value={`+$${stats.total_usd?.toLocaleString()}`}
                color={(stats.total_usd ?? 0) >= 0 ? "var(--up)" : "var(--down)"} />
      <StatPill label="Trade days" value={`${stats.trade_days}`} />
    </div>
  )
}

export default function Analysis() {
  const [data, setData]         = useState<DashboardData | null>(null)
  const [capital, setCapital]   = useState("25000")
  const [period, setPeriod]     = useState<Period>("YTD")
  const [from, setFrom]         = useState("2026-01-01")
  const [to, setTo]             = useState(new Date().toISOString().slice(0, 10))
  const [selected, setSelected] = useState<Set<ComboKey>>(new Set(["orb", "ema"]))

  const load = useCallback(async () => {
    const d = await fetchDashboard()
    if (d) setData(d)
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = (key: ComboKey) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)  // keep at least one
      } else {
        next.add(key)
      }
      return next
    })
  }

  const cap       = parseFloat(capital.replace(/,/g, "")) || 25000
  const combined  = useMemo(() => data ? buildCombinedCurve(data.oos_equity_curve, selected) : [], [data, selected])
  const filtered  = useMemo(() => filterCurve(combined, period, from, to), [combined, period, from, to])
  const rebased   = useMemo(() => rebase(filtered, cap), [filtered, cap])
  const statsKey  = comboStatsKey(selected)
  const stats     = data?.combo_stats?.[statsKey]

  const PERIODS: Period[] = ["1W", "1M", "3M", "YTD", "ALL", "CUSTOM"]
  const COMBOS: ComboKey[] = ["orb", "ema", "overnight"]

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <h1 className="text-xl font-black">Analysis</h1>

        {/* ── Combination + chart ── */}
        <div className="rounded-xl p-5 space-y-4"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

          {/* combination selector */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>PORTFOLIO COMBINATION</p>
            <div className="flex flex-wrap gap-2">
              {COMBOS.map(key => {
                const on      = selected.has(key)
                const shelved = data?.strategies
                  ? Object.values(data.strategies).find(s => s.combo_key === key)?.status === "shelved"
                  : key === "overnight"
                return (
                  <button key={key} onClick={() => toggle(key)}
                          className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                          style={{
                            background: on
                              ? shelved ? "#2a2212" : "var(--accent2)"
                              : "var(--surface2)",
                            color: on
                              ? shelved ? "#f59e0b" : "#fff"
                              : "var(--muted)",
                            border: `1px solid ${on
                              ? shelved ? "#78350f" : "var(--accent2)"
                              : "var(--border)"}`,
                          }}>
                    {COMBO_LABELS[key]}
                    {shelved && <span className="ml-1.5 text-xs opacity-70">(shelved)</span>}
                  </button>
                )
              })}
              <button onClick={() => setSelected(new Set(["orb", "ema"]))}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                Reset
              </button>
            </div>
          </div>

          <div className="h-px" style={{ background: "var(--border)" }} />

          {/* period + capital */}
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

          {/* stats pills */}
          <ComboStats stats={stats} />

          {/* chart */}
          {rebased.length > 0 ? (
            <div className="mt-2">
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
          ) : (
            <p className="text-sm mt-4" style={{ color: "var(--muted)" }}>No data for selected period</p>
          )}
        </div>

        {/* ── Strategy cards ── */}
        {data && (
          <div>
            <h2 className="text-sm font-bold mb-3">All Strategies · Research Pipeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
