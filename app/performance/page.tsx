"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, StrategyPerfDetail, StrategyBacktestStats } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import VarianceCard from "@/components/VarianceCard"

const PerfEquityChart = dynamic(
  () => import("@/components/PerfCharts").then(m => ({ default: m.PerfEquityChart })),
  { ssr: false, loading: () => <Skel h={220} /> }
)
const YearlyBarChart = dynamic(
  () => import("@/components/PerfCharts").then(m => ({ default: m.YearlyBarChart })),
  { ssr: false, loading: () => <Skel h={200} /> }
)
const WinLossPie = dynamic(
  () => import("@/components/PerfCharts").then(m => ({ default: m.WinLossPie })),
  { ssr: false }
)

// ── constants ─────────────────────────────────────────────────────────────────

const UP      = "#00d4aa"
const DOWN    = "#ff4d6d"
const CAPITAL = 22_000

const STRATS = [
  { key: "ema", label: "EMA Cross 5m",  note: null },
  { key: "dc",  label: "DC Mean Rev",   note: null },
  { key: "orb", label: "ORB 30m",       note: "Edge confirmed post-2021. Pre-2021 period (PF ~0.79) is included in the 16y totals — the walkforward gate correctly sits it out in live trading." },
] as const
type StratKey = typeof STRATS[number]["key"]

// ── helpers ───────────────────────────────────────────────────────────────────

function Skel({ h }: { h: number }) {
  return <div className="animate-pulse rounded" style={{ height: h, background: "var(--surface2)" }} />
}

const fmt$ = (v: number, sign = false) => {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}



// ── sub-components ────────────────────────────────────────────────────────────

function KStat({
  label, value, sub, color, last, dim,
}: { label: string; value: string; sub?: string; color?: string; last?: boolean; dim?: boolean }) {
  return (
    <div className="p-4 flex flex-col gap-1"
         style={{ borderRight: last ? "none" : "1px solid var(--border)", opacity: dim ? 0.55 : 1 }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )
}

function MRow({ label, value, color, note }: { label: string; value: string; color?: string; note?: string }) {
  return (
    <div className="flex justify-between items-center py-2"
         style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {label}{note && <span className="ml-1 text-[10px]" style={{ color: "var(--muted)", opacity: 0.6 }}>({note})</span>}
      </span>
      <span className="text-sm font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</span>
    </div>
  )
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold">{title}</h2>
      {sub && <p className="text-xs mt-0.5 mb-4" style={{ color: "var(--muted)" }}>{sub}</p>}
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
  const ytdUsd  = data?.combo_stats?.[active]?.total_usd ?? 0
  const note    = STRATS.find(s => s.key === active)?.note

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">

        {/* Header + strategy selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight">Performance</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Full 16-year backtest · 2010–2026 · 1 MNQ · 1.24 pts cost RT
            </p>
          </div>
          <div className="flex gap-1.5">
            {STRATS.map(s => (
              <button key={s.key} onClick={() => setActive(s.key)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: active === s.key ? "var(--accent2)" : "var(--surface)",
                        color:      active === s.key ? "#fff" : "var(--text2)",
                        border:     "1px solid var(--border)",
                      }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {!data && (
          <div className="space-y-4">
            <Skel h={96} /><Skel h={48} /><Skel h={260} />
            <div className="grid grid-cols-2 gap-4"><Skel h={280} /><Skel h={280} /></div>
          </div>
        )}

        {data && (!bts || !detail) && (
          <div className="rounded-xl p-10 text-center"
               style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Performance detail not yet available — run dashboard push to populate
            </p>
          </div>
        )}

        {data && bts && detail && (
          <>
            {/* ── Row 1: return metrics ─────────────────────────── */}
            <div className="rounded-xl overflow-hidden"
                 style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-2 sm:grid-cols-4"
                   style={{ borderBottom: "1px solid var(--border)" }}>
                <KStat label="Net P&L (16y)"
                       value={fmt$(detail.total_net_usd, true)}
                       sub={`${bts.n_trades.toLocaleString()} trades`}
                       color={detail.total_net_usd >= 0 ? UP : DOWN} />
                <KStat label="Max Drawdown"
                       value={fmt$(bts.max_dd_usd)}
                       sub={`${((bts.max_dd_usd / CAPITAL) * 100).toFixed(1)}% of $${(CAPITAL/1000).toFixed(0)}k`}
                       color={DOWN} />
                <KStat label="Win Rate"
                       value={`${bts.win_pct.toFixed(1)}%`}
                       sub={`${detail.n_winners.toLocaleString()}W · ${detail.n_losers.toLocaleString()}L`} />
                <KStat label="Profit Factor"
                       value={bts.profit_factor.toFixed(2)}
                       color={bts.profit_factor >= 2 ? UP : bts.profit_factor >= 1.3 ? "var(--text)" : DOWN}
                       last />
              </div>

              {/* ── Row 2: risk-adjusted ──────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <KStat label="Sharpe"
                       value={bts.sharpe.toFixed(2)}
                       sub="annualised · daily"
                       color={bts.sharpe >= 1.5 ? UP : bts.sharpe >= 1.0 ? "var(--text)" : "var(--muted)"} />
                <KStat label="Sortino"
                       value={bts.sortino.toFixed(2)}
                       sub="downside deviation"
                       color={bts.sortino >= 2.0 ? UP : bts.sortino >= 1.0 ? "var(--text)" : "var(--muted)"} />
                <KStat label="Calmar"
                       value={bts.calmar.toFixed(2)}
                       sub="CAGR ÷ max DD"
                       color={bts.calmar >= 0.5 ? UP : "var(--text)"} />
                <KStat label="CAGR"
                       value={`${bts.cagr_pct.toFixed(1)}%`}
                       sub={`on $${(CAPITAL/1000).toFixed(0)}k capital · 16y`}
                       color={bts.cagr_pct >= 10 ? UP : "var(--text)"}
                       last />
              </div>
            </div>

            {/* ── Variance / drift indicator ────────────────────── */}
            <VarianceCard
              stats={bts}
              ytdTotalUsd={ytdUsd}
              label={`${STRATS.find(s => s.key === active)?.label ?? active} Variance`}
            />

            {/* ── 16y equity curve ──────────────────────────────── */}
            <Card title="16-Year Equity Curve" sub="Monthly cumulative P&L · 2010–2026 · 1 MNQ">
              <PerfEquityChart data={detail.monthly} />
            </Card>

            {/* ── Trade analysis + annual P&L ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Trade analysis */}
              <Card title="Trade Analysis" sub="">
                <div className="flex items-center gap-5 mb-5">
                  <WinLossPie n_winners={detail.n_winners}
                              n_losers={detail.n_losers}
                              n_breakeven={detail.n_breakeven} />
                  <div className="flex-1 space-y-2">
                    {[
                      { label: "Winners", n: detail.n_winners, pct: bts.win_pct,        color: UP   },
                      { label: "Losers",  n: detail.n_losers,  pct: 100 - bts.win_pct,  color: DOWN },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                          <span className="text-xs font-semibold">{row.n.toLocaleString()} {row.label}</span>
                        </div>
                        <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                          {row.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                    <div className="h-1.5 rounded-full overflow-hidden flex mt-2">
                      <div style={{ width: `${bts.win_pct}%`,       background: UP   }} />
                      <div style={{ width: `${100 - bts.win_pct}%`, background: DOWN }} />
                    </div>
                  </div>
                </div>

                <MRow label="Expectancy"
                      value={`${fmt$(bts.expectancy_usd, true)} / trade (${bts.expectancy_pts > 0 ? "+" : ""}${bts.expectancy_pts.toFixed(1)} pts)`}
                      color={bts.expectancy_usd >= 0 ? UP : DOWN} />
                <MRow label="Payoff ratio"     value={bts.payoff_ratio.toFixed(2)}          note="avg win ÷ avg loss" />
                <MRow label="Avg winner"        value={fmt$(detail.avg_win_usd, true)}       color={UP}   />
                <MRow label="Avg loser"         value={fmt$(detail.avg_loss_usd)}            color={DOWN} />
                <MRow label="Largest win"       value={fmt$(detail.largest_win_usd, true)}  color={UP}   />
                <MRow label="Largest loss"      value={fmt$(detail.largest_loss_usd)}        color={DOWN} />
                <MRow label="Max consec losses" value={`${bts.max_consec_losses}`}
                      color={bts.max_consec_losses > 10 ? DOWN : "var(--text)"}
                      note="streak" />
                <MRow label="Monthly win rate"  value={`${bts.monthly_win_rate.toFixed(1)}%`}
                      note="% months profitable" />
                <MRow label="Monthly avg"       value={fmt$(bts.monthly_mean_usd, true)}    color={bts.monthly_mean_usd >= 0 ? UP : DOWN} />
                <MRow label="Monthly std dev"   value={`± ${fmt$(bts.monthly_std_usd)}`}
                      note="return volatility" />
                <MRow label="Gross profit"      value={fmt$(detail.gross_profit_usd, true)} color={UP}   />
                <MRow label="Gross loss"        value={fmt$(detail.gross_loss_usd)}          color={DOWN} />
              </Card>

              {/* Annual P&L */}
              <Card title="Annual P&L" sub="Yearly net · green = profitable · 1 MNQ">
                <YearlyBarChart data={detail.monthly} />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(() => {
                    const by_year = detail.monthly.reduce<Record<string, number>>((a, m) => {
                      const y = m.month.slice(0, 4); a[y] = (a[y] ?? 0) + m.pnl; return a
                    }, {})
                    const vals = Object.values(by_year)
                    return [
                      { label: "Best year",  value: fmt$(Math.max(...vals), true), color: UP   },
                      { label: "Worst year", value: fmt$(Math.min(...vals)),        color: DOWN },
                    ]
                  })().map(s => (
                    <div key={s.label} className="rounded-lg p-3"
                         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>{s.label}</p>
                      <p className="text-base font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ORB era note */}
            {note && (
              <div className="rounded-lg px-4 py-3 text-xs"
                   style={{ background: "#0a1a10", border: "1px solid #1a3020", color: "#86efac" }}>
                ⚠ {note}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
