"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, StrategyPerfDetail, StrategyBacktestStats, MonthlyPoint } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"

// Chart components — recharts must not SSR
const PerfEquityChart = dynamic(
  () => import("@/components/PerfCharts").then(m => ({ default: m.PerfEquityChart })),
  { ssr: false, loading: () => <Skeleton h={220} /> }
)
const YearlyBarChart = dynamic(
  () => import("@/components/PerfCharts").then(m => ({ default: m.YearlyBarChart })),
  { ssr: false, loading: () => <Skeleton h={200} /> }
)
const WinLossPie = dynamic(
  () => import("@/components/PerfCharts").then(m => ({ default: m.WinLossPie })),
  { ssr: false }
)

// ── helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ h }: { h: number }) {
  return <div className="animate-pulse rounded" style={{ height: h, background: "var(--surface2)" }} />
}

const UP   = "#00d4aa"
const DOWN = "#ff4d6d"

function fmt$(v: number, sign = false): string {
  const abs = Math.abs(v)
  const s   = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${abs.toLocaleString()}`
}

// ── strategy config ───────────────────────────────────────────────────────────

const STRATS = [
  { key: "ema", label: "EMA Cross 5m",    note: null },
  { key: "dc",  label: "DC Mean Rev",     note: null },
  { key: "orb", label: "ORB 30m",         note: "Edge confirmed post-2021 · pre-2021 era (known weakness) included in 16y totals" },
] as const

type StratKey = typeof STRATS[number]["key"]

// ── sub-components ────────────────────────────────────────────────────────────

function KeyStat({
  label, value, sub, color, last,
}: { label: string; value: string; sub?: string; color?: string; last?: boolean }) {
  return (
    <div className="p-5 flex flex-col gap-1"
         style={{ borderRight: last ? "none" : "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )
}

function MRow({
  label, value, color,
}: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2"
         style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</span>
    </div>
  )
}

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold mb-1">{title}</h2>
      {sub && <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function Performance() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [active, setActive] = useState<StratKey>("ema")

  const load = useCallback(async () => {
    const d = await fetchDashboard()
    if (d) setData(d)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  const bts:    StrategyBacktestStats | undefined = data?.strategy_backtest_stats?.[active]
  const detail: StrategyPerfDetail   | undefined = data?.performance_detail?.[active]
  const note = STRATS.find(s => s.key === active)?.note

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">

        {/* Header + strategy selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight">Performance</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Full 16-year backtest · 2010–2026 · 1 MNQ · costs 1.24 pts RT
            </p>
          </div>
          <div className="flex gap-1.5">
            {STRATS.map(s => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active === s.key ? "var(--accent2)" : "var(--surface)",
                  color:      active === s.key ? "#fff" : "var(--text2)",
                  border:     "1px solid var(--border)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {!data && (
          <div className="space-y-4">
            <Skeleton h={96} />
            <Skeleton h={260} />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton h={280} />
              <Skeleton h={280} />
            </div>
          </div>
        )}

        {data && (!bts || !detail) && (
          <div className="rounded-xl p-10 text-center"
               style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Performance detail not in dashboard yet — run dashboard push to populate
            </p>
          </div>
        )}

        {data && bts && detail && (
          <>
            {/* Key stats bar */}
            <div className="rounded-xl overflow-hidden"
                 style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <KeyStat
                  label="Net P&L"
                  value={fmt$(detail.total_net_usd, true)}
                  sub={`${bts.n_trades.toLocaleString()} trades · 16y`}
                  color={detail.total_net_usd >= 0 ? UP : DOWN}
                />
                <KeyStat
                  label="Max Drawdown"
                  value={fmt$(bts.max_dd_usd)}
                  sub={`${((bts.max_dd_usd / 22000) * 100).toFixed(1)}% of $22k capital`}
                  color={DOWN}
                />
                <KeyStat
                  label="Win Rate"
                  value={`${bts.win_pct.toFixed(1)}%`}
                  sub={`${detail.n_winners.toLocaleString()}W · ${detail.n_losers.toLocaleString()}L`}
                />
                <KeyStat
                  label="Profit Factor"
                  value={bts.profit_factor.toFixed(2)}
                  sub={`expectancy ${fmt$(bts.expectancy_usd, true)} / trade`}
                  color={bts.profit_factor >= 1.5 ? UP : bts.profit_factor >= 1.0 ? "var(--text)" : DOWN}
                  last
                />
              </div>
            </div>

            {/* 16y equity curve */}
            <SectionCard
              title="16-Year Equity Curve"
              sub="Monthly cumulative P&L · 2010–2026 · 1 MNQ"
            >
              <PerfEquityChart data={detail.monthly} />
            </SectionCard>

            {/* Trade analysis + annual P&L */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Trade analysis */}
              <SectionCard title="Trade Analysis" sub="">
                {/* Win/loss donut + legend */}
                <div className="flex items-center gap-5 mb-5">
                  <WinLossPie
                    n_winners={detail.n_winners}
                    n_losers={detail.n_losers}
                    n_breakeven={detail.n_breakeven}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: UP }} />
                        <span className="text-xs font-semibold">{detail.n_winners.toLocaleString()} Winners</span>
                      </div>
                      <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                        {bts.win_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: DOWN }} />
                        <span className="text-xs font-semibold">{detail.n_losers.toLocaleString()} Losers</span>
                      </div>
                      <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                        {(100 - bts.win_pct).toFixed(1)}%
                      </span>
                    </div>
                    {detail.n_breakeven > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#374151" }} />
                          <span className="text-xs font-semibold">{detail.n_breakeven} Breakeven</span>
                        </div>
                      </div>
                    )}
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full overflow-hidden flex mt-3">
                      <div style={{ width: `${bts.win_pct}%`, background: UP }} />
                      <div style={{ width: `${100 - bts.win_pct}%`, background: DOWN }} />
                    </div>
                  </div>
                </div>

                {/* Metric rows */}
                <div className="-mt-1">
                  <MRow
                    label="Expectancy"
                    value={`${fmt$(bts.expectancy_usd, true)} / trade (${bts.expectancy_pts > 0 ? "+" : ""}${bts.expectancy_pts.toFixed(1)} pts)`}
                    color={bts.expectancy_usd >= 0 ? UP : DOWN}
                  />
                  <MRow label="Avg winner"      value={fmt$(detail.avg_win_usd, true)}        color={UP}   />
                  <MRow label="Avg loser"        value={fmt$(detail.avg_loss_usd)}              color={DOWN} />
                  <MRow label="Largest win"      value={fmt$(detail.largest_win_usd, true)}    color={UP}   />
                  <MRow label="Largest loss"     value={fmt$(detail.largest_loss_usd)}          color={DOWN} />
                  <MRow label="Gross profit"     value={fmt$(detail.gross_profit_usd, true)}   color={UP}   />
                  <MRow label="Gross loss"       value={fmt$(detail.gross_loss_usd)}            color={DOWN} />
                </div>
              </SectionCard>

              {/* Annual P&L */}
              <SectionCard
                title="Annual P&L"
                sub="Yearly net · green = profitable year · 1 MNQ"
              >
                <YearlyBarChart data={detail.monthly} />

                {/* Yearly stats summary */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Best year",
                      value: fmt$(
                        Math.max(...Object.values(
                          detail.monthly.reduce<Record<string, number>>((a, m) => {
                            const y = m.month.slice(0, 4)
                            a[y] = (a[y] ?? 0) + m.pnl
                            return a
                          }, {})
                        )),
                        true
                      ),
                      color: UP,
                    },
                    {
                      label: "Worst year",
                      value: fmt$(
                        Math.min(...Object.values(
                          detail.monthly.reduce<Record<string, number>>((a, m) => {
                            const y = m.month.slice(0, 4)
                            a[y] = (a[y] ?? 0) + m.pnl
                            return a
                          }, {})
                        ))
                      ),
                      color: DOWN,
                    },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg p-3"
                         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>{s.label}</p>
                      <p className="text-base font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* ORB era note */}
            {note && (
              <div className="rounded-lg px-4 py-3 text-xs"
                   style={{ background: "#111a14", border: "1px solid #1a3020", color: "#86efac" }}>
                ⚠ {note}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
