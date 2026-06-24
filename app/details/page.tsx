"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, LiveTrade, LiveDayCurve } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"

const LiveCurveChart = dynamic(() => import("@/components/LiveCurveChart"), {
  ssr: false,
  loading: () => <div className="h-52 animate-pulse rounded" style={{ background: "var(--surface2)" }} />,
})

const UP   = "#00d4aa"
const DOWN = "#ff4d6d"
const MUTED = "var(--muted)"

const fmt = (n: number | null, sign = false, decimals = 1) => {
  if (n === null || n === undefined) return "—"
  const s = n < 0 ? "−" : sign && n > 0 ? "+" : ""
  return `${s}${Math.abs(n).toFixed(decimals)}`
}
const fmt$ = (n: number | null, sign = false) => {
  if (n === null || n === undefined) return "—"
  const s = n < 0 ? "−" : sign && n > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(n ?? 0)).toLocaleString()}`
}
const pnlColor = (n: number | null) => n === null ? MUTED : n >= 0 ? UP : DOWN

const EXIT_LABELS: Record<string, string> = {
  stop: "Stop",
  eod:  "EOD flat",
  reverse: "Reverse",
  time: "Time stop",
}

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg px-4 py-3 text-center"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="text-xs mb-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
    </div>
  )
}

function TradeRow({ t }: { t: LiveTrade }) {
  const slipColor = t.entry_slippage_pts <= 0 ? UP : DOWN // negative slip = favorable
  const vsColor   = pnlColor(t.vs_expectancy_pts)

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td className="py-2 pr-3 text-xs font-semibold whitespace-nowrap" style={{ color: "var(--text)" }}>
        {t.strategy}
      </td>
      <td className="py-2 pr-3 text-xs whitespace-nowrap" style={{ color: MUTED }}>
        {t.entry_time_sgt.slice(5)}
      </td>
      <td className="py-2 pr-3 text-xs whitespace-nowrap" style={{ color: MUTED }}>
        {t.exit_time_sgt.slice(5)}
      </td>
      <td className="py-2 pr-3 text-xs tabular-nums" style={{ color: "var(--text)" }}>
        {t.entry_signal_ref.toFixed(2)}
      </td>
      <td className="py-2 pr-3 text-xs tabular-nums" style={{ color: "var(--text)" }}>
        {t.entry_fill.toFixed(2)}
      </td>
      <td className="py-2 pr-3 text-xs tabular-nums font-semibold" style={{ color: slipColor }}>
        {fmt(t.entry_slippage_pts, true)} pts
      </td>
      <td className="py-2 pr-3 text-xs tabular-nums font-bold" style={{ color: pnlColor(t.actual_pnl_pts) }}>
        {fmt(t.actual_pnl_pts, true)} pts
        <span className="ml-1 font-normal text-[11px]" style={{ color: MUTED }}>
          ({fmt$(t.actual_pnl_usd, true)})
        </span>
      </td>
      <td className="py-2 pr-3 text-xs tabular-nums" style={{ color: MUTED }}>
        {fmt(t.backtest_exp_pts, true)} pts
        <span className="ml-1 text-[11px]">({fmt$(t.backtest_exp_usd, true)})</span>
      </td>
      <td className="py-2 pr-3 text-xs tabular-nums font-semibold" style={{ color: vsColor }}>
        {fmt(t.vs_expectancy_pts, true)} pts
      </td>
      <td className="py-2 text-xs" style={{ color: MUTED }}>
        {EXIT_LABELS[t.exit_type] ?? t.exit_type}
      </td>
    </tr>
  )
}

export default function Details() {
  const [data, setData]         = useState<DashboardData | null>(null)
  const [selectedWeek, setWeek] = useState<string>("all")

  const load = useCallback(async () => {
    const d = await fetchDashboard()
    if (d) setData(d)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  const lt   = data?.live_trades
  const sum  = lt?.summary
  const allTrades = lt?.trades ?? []
  const weeks     = lt?.week_list ?? []

  const visibleTrades = selectedWeek === "all"
    ? allTrades
    : allTrades.filter(t => t.week === selectedWeek)

  const curveData: LiveDayCurve[] = (() => {
    if (!lt?.daily_curve) return []
    if (selectedWeek === "all") return lt.daily_curve
    // Filter curve to the selected week's dates
    const weekTrades = allTrades.filter(t => t.week === selectedWeek)
    if (!weekTrades.length) return lt.daily_curve
    const dates = new Set(weekTrades.map(t => t.trade_date))
    const allDates = lt.daily_curve.map(p => p.date)
    const weekStart = allDates.find(d => dates.has(d)) ?? allDates[0]
    const weekEnd   = [...allDates].reverse().find(d => dates.has(d)) ?? allDates[allDates.length - 1]
    return lt.daily_curve.filter(p => p.date >= weekStart && p.date <= weekEnd)
  })()

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight">Details</h1>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              Live trades since {sum?.live_since ?? "—"} · signal ref vs actual fill vs backtest expectancy
            </p>
          </div>

          {/* Week selector */}
          {weeks.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setWeek("all")}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium"
                      style={{
                        background: selectedWeek === "all" ? "var(--accent2)" : "var(--surface)",
                        color: selectedWeek === "all" ? "#fff" : "var(--text2)",
                        border: "1px solid var(--border)",
                      }}>
                All weeks
              </button>
              {weeks.map(w => (
                <button key={w} onClick={() => setWeek(w)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{
                          background: selectedWeek === w ? "var(--accent2)" : "var(--surface)",
                          color: selectedWeek === w ? "#fff" : "var(--text2)",
                          border: "1px solid var(--border)",
                        }}>
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary chips */}
        {sum && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatChip label="Total trades"  value={`${sum.total_trades}`} />
            <StatChip label="Win rate"      value={`${sum.win_rate}%`}
                      color={sum.win_rate >= 50 ? UP : DOWN} />
            <StatChip label="Total P&L"     value={fmt$(sum.total_pnl_usd, true)}
                      color={pnlColor(sum.total_pnl_usd)} />
            <StatChip label="Total pts"     value={`${fmt(sum.total_pnl_pts, true)} pts`}
                      color={pnlColor(sum.total_pnl_pts)} />
            <StatChip label="Avg entry slip" value={`${fmt(sum.avg_slippage_pts, true)} pts`}
                      color={sum.avg_slippage_pts <= 0 ? UP : DOWN} />
          </div>
        )}

        {/* Cumulative P&L curve */}
        <div className="rounded-xl p-5"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold mb-1">
            Cumulative P&L — {selectedWeek === "all" ? "All live weeks" : selectedWeek}
          </h2>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Actual fills · {selectedWeek === "all" ? `since ${sum?.live_since ?? "go-live"}` : "selected week"}
          </p>
          {curveData.length > 0
            ? <LiveCurveChart data={curveData} />
            : <div className="h-48 flex items-center justify-center text-sm" style={{ color: MUTED }}>
                No data yet
              </div>
          }
        </div>

        {/* Trade table */}
        <div className="rounded-xl p-5 overflow-x-auto"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold mb-4">
            Trade log {selectedWeek !== "all" ? `· ${selectedWeek}` : ""}
            <span className="ml-2 font-normal text-xs" style={{ color: MUTED }}>
              {visibleTrades.length} trade{visibleTrades.length !== 1 ? "s" : ""}
            </span>
          </h2>

          {visibleTrades.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: MUTED }}>
              No completed live trades yet
            </p>
          ) : (
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    "Strategy", "Entry (SGT)", "Exit (SGT)", "Signal Ref",
                    "Actual Fill", "Slippage (A)", "Actual P&L",
                    "Backtest Avg (B)", "vs Expected (C)", "Exit",
                  ].map(h => (
                    <th key={h} className="pb-2 pr-3 text-xs font-semibold"
                        style={{ color: MUTED }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleTrades.map((t, i) => <TradeRow key={i} t={t} />)}
              </tbody>
            </table>
          )}

          <div className="mt-4 pt-3 text-xs space-y-1" style={{ borderTop: "1px solid var(--border)", color: MUTED }}>
            <p><span className="font-semibold">A · Slippage</span>: Actual fill vs signal ref price. Negative = favorable (filled better than signal).</p>
            <p><span className="font-semibold">B · Backtest Avg</span>: Historical expectancy per trade for this strategy over 16y backtest.</p>
            <p><span className="font-semibold">C · vs Expected</span>: Actual P&L minus backtest expectancy. Converges to 0 over many trades.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
