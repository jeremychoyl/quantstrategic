"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, Strategy16y } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"

const UP = "#00d4aa", DOWN = "#ff4d6d"

const PerfEquityChart = dynamic(() => import("@/components/PerfCharts").then(m => ({ default: m.PerfEquityChart })), { ssr: false, loading: () => <Skel h={220} /> })
const YearlyBarChart = dynamic(() => import("@/components/PerfCharts").then(m => ({ default: m.YearlyBarChart })), { ssr: false, loading: () => <Skel h={200} /> })
const MonthlyHeatmap = dynamic(() => import("@/components/MonthlyHeatmap"), { ssr: false, loading: () => <Skel h={200} /> })
const LiveCurveChart = dynamic(() => import("@/components/LiveCurveChart"), { ssr: false, loading: () => <Skel h={200} /> })
const BenchmarkChart = dynamic(() => import("@/components/BenchmarkChart"), { ssr: false, loading: () => <Skel h={260} /> })

const fmt$ = (v: number, sign = false) => {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}

function Skel({ h }: { h: number }) {
  return <div className="animate-pulse rounded" style={{ height: h, background: "var(--surface2)" }} />
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
function KStat({ label, value, sub, color, last }: { label: string; value: string; sub?: string; color?: string; last?: boolean }) {
  return (
    <div className="p-4 flex flex-col gap-1" style={{ borderRight: last ? "none" : "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-xl font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )
}

export default function Performance() {
  const [data, setData] = useState<DashboardData | null>(null)
  const load = useCallback(async () => { const d = await fetchDashboard(); if (d) setData(d) }, [])
  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id) }, [load])

  const b: Strategy16y | undefined = data?.projections?.book_16y
  const live = data?.live_trades

  let bestMo = 0, worstMo = 0
  if (b?.monthly?.length) {
    bestMo = Math.max(...b.monthly.map(m => m.pnl))
    worstMo = Math.min(...b.monthly.map(m => m.pnl))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-black tracking-tight">Performance</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Combined-book returns tearsheet · ORB + EMA + DC · 1 contract each · 16-year backtest + live
          </p>
        </div>

        {!data && <div className="space-y-4"><Skel h={96} /><Skel h={240} /><Skel h={200} /></div>}

        {b && (
          <>
            {/* Summary ratios */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-2 sm:grid-cols-5" style={{ borderBottom: "1px solid var(--border)" }}>
                <KStat label="16-year net" value={fmt$(b.total_usd, true)} sub={`${b.n_trades.toLocaleString()} trading days`} color={UP} />
                <KStat label="Sharpe" value={b.sharpe.toFixed(2)} sub="annualised" />
                <KStat label="Sortino" value={b.sortino.toFixed(2)} sub="downside only" />
                <KStat label="Calmar" value={b.calmar.toFixed(2)} sub="CAGR ÷ max DD" />
                <KStat label="Profit factor" value={b.profit_factor.toFixed(2)} sub="gross up ÷ down" color={b.profit_factor >= 1.5 ? UP : "var(--text)"} last />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5">
                <KStat label="Daily win rate" value={`${b.win_rate}%`} sub="% profitable days" />
                <KStat label="Max drawdown" value={fmt$(-Math.abs(b.max_dd_usd))} sub="peak-to-trough" color={DOWN} />
                <KStat label="Recovery factor" value={`${b.recovery_factor}×`} sub="net ÷ max DD" />
                <KStat label="Best month" value={fmt$(bestMo, true)} color={UP} />
                <KStat label="Worst month" value={fmt$(worstMo)} color={DOWN} last />
              </div>
            </div>

            <Card title="16-Year Equity Curve" sub="Monthly cumulative P&L · 2010–2026 · 1 contract each">
              <PerfEquityChart data={b.monthly} />
            </Card>

            <Card title="Monthly Returns" sub="Net P&L per month ($k) · green = profitable · year total at right">
              <MonthlyHeatmap monthly={b.monthly} />
            </Card>

            <Card title="Annual P&L" sub="Yearly net · green = profitable · 1 contract each">
              <YearlyBarChart data={b.monthly} />
            </Card>

            {/* Benchmarks — the "is this worth it" panel (audit P2-10) */}
            {data?.benchmarks?.curve?.length ? (
              <Card title="Book vs Benchmarks — 2026 YTD"
                    sub={`Same $${(data.benchmarks.capital_base / 1000).toFixed(0)}k capital · buy & hold 1 MNQ · 3M T-bill at ${data.benchmarks.tbill_rate_pct}% · risk-adjusted is the pitch, so drawdowns shown side by side`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Book</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: data.benchmarks.summary.book_usd >= 0 ? UP : DOWN }}>
                      {fmt$(data.benchmarks.summary.book_usd, true)} <span className="text-xs font-normal">({data.benchmarks.summary.book_pct}%)</span></p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>maxDD {fmt$(-data.benchmarks.summary.book_maxdd_usd)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Buy & hold 1 MNQ</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: data.benchmarks.summary.bh_usd >= 0 ? UP : DOWN }}>
                      {fmt$(data.benchmarks.summary.bh_usd, true)} <span className="text-xs font-normal">({data.benchmarks.summary.bh_pct}%)</span></p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>maxDD {fmt$(-data.benchmarks.summary.bh_maxdd_usd)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>T-bill</p>
                    <p className="text-xl font-bold tabular-nums">{fmt$(data.benchmarks.summary.tbill_usd, true)}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>riskless floor</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Alpha vs B&H</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: data.benchmarks.summary.alpha_vs_bh_usd >= 0 ? UP : DOWN }}>
                      {fmt$(data.benchmarks.summary.alpha_vs_bh_usd, true)}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>book − buy & hold</p></div>
                </div>
                <BenchmarkChart data={data.benchmarks.curve} />
              </Card>
            ) : null}

            {/* Live tearsheet */}
            {live?.summary && (
              <Card title="Live — since inception" sub={`Real fills since ${live.summary.live_since} · small sample, accumulating toward the 100-trade gate`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Net P&L</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: live.summary.total_pnl_usd >= 0 ? UP : DOWN }}>{fmt$(live.summary.total_pnl_usd, true)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Trades</p>
                    <p className="text-xl font-bold tabular-nums">{live.summary.total_trades}</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Win rate</p>
                    <p className="text-xl font-bold tabular-nums">{live.summary.win_rate}%</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Avg slippage</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: "#f59e0b" }}>{live.summary.avg_slippage_pts.toFixed(1)} pts</p></div>
                </div>
                {live.daily_curve?.length ? <LiveCurveChart data={live.daily_curve} /> : null}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
