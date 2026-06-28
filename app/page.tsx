"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import ReturnsHero from "@/components/ReturnsHero"
import PnLBarClient from "@/components/PnLBarClient"
import Positions from "@/components/Positions"
import ShareCard from "@/components/ShareCard"

const LiveCurveChart = dynamic(() => import("@/components/LiveCurveChart"), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded" style={{ background: "var(--surface2)" }} />,
})

const UP   = "#00d4aa"
const DOWN = "#ff4d6d"

const fmt$ = (v: number, sign = false) => {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}

function LiveStatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg px-4 py-3"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
    </div>
  )
}

export default function Overview() {
  const [data, setData]   = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    const d = await fetchDashboard()
    if (d) { setData(d); setError(false) }
    else setError(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id  = setInterval(load, 60_000)
    const t   = setTimeout(() => setLoading(false), 10_000)
    return () => { clearInterval(id); clearTimeout(t) }
  }, [load])

  const sum     = data?.live_trades?.summary
  const curve   = data?.live_trades?.daily_curve ?? []
  const hasLive = curve.length > 0

  // Projected book — from the cached YTD equity curve
  const ytd  = data?.projections?.ytd_equity
  const ser  = ytd?.series ?? []
  const end  = ytd?.end
  const last5 = (pick: (p: typeof ser[number]) => number) => {
    if (!ser.length) return 0
    const lastV  = pick(ser[ser.length - 1])
    const backV  = ser.length >= 6 ? pick(ser[ser.length - 6]) : 0
    return lastV - backV
  }
  const bookYtd  = end?.combined ?? 0
  const liveYtd  = (end?.orb ?? 0) + (end?.ema ?? 0) + (end?.dc ?? 0)
  const book5d   = last5(p => p.combined ?? 0)

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm animate-pulse" style={{ color: "var(--muted)" }}>
              Loading QuantStrategic…
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl p-6 text-center"
               style={{ background: "var(--surface)", border: "1px solid #3d1515" }}>
            <p className="text-sm" style={{ color: DOWN }}>
              Dashboard data unavailable — data pipeline initialising
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Auto-retries every 60s</p>
          </div>
        )}

        {data && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight">Overview</h1>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  Live since {data.live_since} · 3 strategies · 1 MNQ each · $2/pt
                </p>
              </div>
              <ShareCard data={data} />
            </div>

            {/* Positions */}
            <Positions positions={data.active_positions} mode={data.bridge_mode} />

            {/* Live P&L summary chips */}
            {sum && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <LiveStatChip label="Live trades"    value={`${sum.total_trades}`} />
                <LiveStatChip label="Win rate"       value={`${sum.win_rate}%`}
                              color={sum.win_rate >= 50 ? UP : DOWN} />
                <LiveStatChip label="Total P&L"      value={fmt$(sum.total_pnl_usd, true)}
                              color={sum.total_pnl_usd >= 0 ? UP : DOWN} />
                <LiveStatChip label="Total pts"      value={`${sum.total_pnl_pts >= 0 ? "+" : ""}${sum.total_pnl_pts.toFixed(1)} pts`}
                              color={sum.total_pnl_pts >= 0 ? UP : DOWN} />
                <LiveStatChip label="Avg entry slip" value={`${sum.avg_slippage_pts >= 0 ? "+" : ""}${sum.avg_slippage_pts.toFixed(1)} pts`}
                              color={sum.avg_slippage_pts <= 0 ? UP : DOWN} />
              </div>
            )}

            {/* Live P&L curve + daily bar chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl p-5"
                   style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h2 className="text-sm font-bold mb-1">Live Equity Curve</h2>
                <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                  Actual fills · cumulative P&L since {data.live_since}
                </p>
                {hasLive
                  ? <LiveCurveChart data={curve} />
                  : <div className="h-48 flex items-center justify-center text-sm"
                         style={{ color: "var(--muted)" }}>
                      No live trades yet — check back after first signal fires
                    </div>
                }
              </div>

              <div className="rounded-xl p-5"
                   style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h2 className="text-sm font-bold mb-1">Live P&L by Day</h2>
                <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                  Actual fills · points per day since go-live
                </p>
                <PnLBarClient data={data.last_7_days} />
              </div>
            </div>

            {/* Net returns (live actual) */}
            <ReturnsHero returns={data.net_returns} />

            {/* Projected book — YTD (backtest/OOS basis) */}
            {ytd && (
              <div>
                <h2 className="text-sm font-bold mb-1">Projected Book — 2026 YTD</h2>
                <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                  Backtest/OOS · 1 contract each · 3 live MNQ · {ytd.since} → {ytd.through}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <LiveStatChip label="Book YTD"        value={fmt$(bookYtd, true)} color={bookYtd >= 0 ? UP : DOWN} />
                  <LiveStatChip label="Book last 5 days" value={fmt$(book5d, true)} color={book5d >= 0 ? UP : DOWN} />
                  <LiveStatChip label="Live MNQ YTD"    value={fmt$(liveYtd, true)} color={liveYtd >= 0 ? UP : DOWN} />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
