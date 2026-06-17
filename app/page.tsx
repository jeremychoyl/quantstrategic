"use client"
import { useEffect, useState, useCallback } from "react"
import { DashboardData, StrategyBacktestStats } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import ReturnsHero from "@/components/ReturnsHero"
import EquityCurveClient from "@/components/EquityCurveClient"
import PnLBarClient from "@/components/PnLBarClient"
import StatsGrid from "@/components/StatsGrid"
import Positions from "@/components/Positions"
import ShareCard from "@/components/ShareCard"
import VarianceCard from "@/components/VarianceCard"

const STRATEGY_DISPLAY: Record<string, string> = {
  orb: "ORB 30m",
  ema: "EMA Cross 5m",
  dc:  "DC Mean Reversion",
}

function StrategyStatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>{value}</span>
      </div>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )
}

function StrategyBacktestSection({
  stats, strategies,
}: {
  stats: Record<string, StrategyBacktestStats>
  strategies: Record<string, import("@/lib/types").Strategy>
}) {
  const activeKeys = Object.entries(strategies)
    .filter(([, s]) => s.in_portfolio && s.combo_key && stats[s.combo_key])
    .map(([, s]) => s.combo_key)

  if (activeKeys.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-bold mb-3">Strategy Statistics · Full Backtest (16y)</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {activeKeys.map(key => {
          const s = stats[key]
          return (
            <div key={key}
                 className="rounded-lg p-4"
                 style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-black mb-3">{STRATEGY_DISPLAY[key] ?? key}</p>
              <StrategyStatCard
                label="Profit Factor"
                value={s.profit_factor.toFixed(2)}
                sub="gross win / gross loss · 2010–2026"
              />
              <StrategyStatCard
                label="Expectancy"
                value={`${s.expectancy_pts > 0 ? "+" : ""}${s.expectancy_pts.toFixed(1)} pts`}
                sub={`$${(s.expectancy_usd > 0 ? "+" : "") + s.expectancy_usd.toFixed(0)} per trade avg`}
              />
              <StrategyStatCard
                label="Peak-to-Trough DD"
                value={`-$${Math.abs(s.max_dd_usd).toLocaleString()}`}
                sub="max intra-backtest drawdown"
              />
              <StrategyStatCard
                label="Trades"
                value={s.n_trades.toLocaleString()}
                sub={`win rate ${s.win_pct.toFixed(0)}%`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Overview() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

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
            <p className="text-sm" style={{ color: "#ff4d6d" }}>
              Dashboard data unavailable — data pipeline initialising
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Auto-retries every 60s</p>
          </div>
        )}

        {data && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight">Overview</h1>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  Demo since {data.demo_since} · 3 strategies · 1 MNQ each
                </p>
              </div>
              <ShareCard data={data} />
            </div>

            <ReturnsHero returns={data.net_returns} />
            <Positions positions={data.active_positions} mode={data.bridge_mode} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl p-5"
                   style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h2 className="text-sm font-bold mb-1">2026 OOS Equity Curve</h2>
                <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                  Backtest · Jan 2026 → present · cumulative P&L ($)
                </p>
                <EquityCurveClient data={data.oos_equity_curve} />
              </div>

              <div className="rounded-xl p-5"
                   style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h2 className="text-sm font-bold mb-1">Last 7 Days · Demo P&L</h2>
                <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                  Actual demo fills · points per day
                </p>
                <PnLBarClient data={data.last_7_days} />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold mb-3">Portfolio Statistics · 2026 OOS</h2>
              <StatsGrid stats={data.portfolio_stats} />
            </div>

            {data.strategy_backtest_stats?.portfolio && (
              <VarianceCard
                stats={data.strategy_backtest_stats.portfolio}
                ytdTotalUsd={data.combo_stats?.["ema+orb+dc"]?.total_usd ?? 0}
                label="Portfolio Variance · ORB + EMA + DC"
              />
            )}

            {data.strategy_backtest_stats && (
              <StrategyBacktestSection stats={data.strategy_backtest_stats} strategies={data.strategies} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
