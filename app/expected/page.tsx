"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, Projections } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import BookProjection, { CorrelationMatrix } from "@/components/BookProjection"

const PerfEquityChart = dynamic(
  () => import("@/components/PerfCharts").then(m => ({ default: m.PerfEquityChart })),
  { ssr: false, loading: () => <Skel h={220} /> }
)
const BookEquityChart = dynamic(
  () => import("@/components/BookEquityChart"),
  { ssr: false, loading: () => <Skel h={300} /> }
)

const UP      = "#00d4aa"
const DOWN    = "#ff4d6d"

const STRATS = [
  { key: "all",   label: "All",          note: null },
  { key: "orb",   label: "ORB 30m",      note: "Edge confirmed post-2021. Pre-2021 period (PF ~0.79) is included in the 16y totals — the walkforward gate correctly sits it out in live trading." },
  { key: "ema",   label: "EMA Cross 5m", note: null },
  { key: "dc",    label: "DC Mean Rev",  note: null },
  { key: "gold",  label: "Gold short",   note: "Demo sandbox (MGC). Daily Donchian-high short reversion." },
  { key: "crude", label: "Crude short",  note: "Demo sandbox (MCL). Daily Donchian-high short reversion." },
] as const
type StratKey = typeof STRATS[number]["key"]
type StrategyKey = "orb" | "ema" | "dc" | "gold" | "crude"   // every tab except "all"
const PER_STRATEGY_NAME: Record<StrategyKey, string> = {
  orb: "ORB", ema: "EMA", dc: "DC", gold: "Gold", crude: "Crude",
}

function Skel({ h }: { h: number }) {
  return <div className="animate-pulse rounded" style={{ height: h, background: "var(--surface2)" }} />
}

const fmt$ = (v: number, sign = false) => {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}
function KStat({ label, value, sub, color, last }: {
  label: string; value: string; sub?: string; color?: string; last?: boolean
}) {
  return (
    <div className="p-4 flex flex-col gap-1"
         style={{ borderRight: last ? "none" : "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>}
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

function RiskTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-black tabular-nums" style={{ color: "#fbbf24" }}>{value}</p>
      <p className="text-xs leading-snug" style={{ color: "var(--muted)" }}>{caption}</p>
    </div>
  )
}

function StrategyProjectionPanel({ projections, k }: { projections: Projections; k: StrategyKey }) {
  const s = projections.per_strategy.find(p => p.name === PER_STRATEGY_NAME[k])
  const ytdEnd = projections.ytd_equity?.end?.[k]
  const f = projections.strategy_16y?.[k]
  return (
    <div className="space-y-5">
      {/* ── TOP HALF · 2026 YTD ── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold">2026 YTD</h2>
          {s && <span className="text-xs" style={{ color: "var(--muted)" }}>{s.instrument} · {s.direction.replace("-", " ")}</span>}
        </div>
        {projections.ytd_equity && <BookEquityChart eq={projections.ytd_equity} focus={k} />}
      </div>

      {/* ── BOTTOM HALF · full 16-year backtest ── */}
      {f && (
        <div className="space-y-4 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold">Full 16-Year Backtest</h2>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {f.n_trades.toLocaleString()} trades · 2010–2026 · net {fmt$(f.total_usd, true)}
            </span>
          </div>

          {/* base 6 + 4 ratios */}
          <div className="rounded-xl overflow-hidden"
               style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="grid grid-cols-2 sm:grid-cols-5" style={{ borderBottom: "1px solid var(--border)" }}>
              <KStat label="Win rate"      value={`${f.win_rate}%`} sub="hit rate" />
              <KStat label="Avg winner"    value={fmt$(f.avg_win_usd, true)} sub="per win" color={UP} />
              <KStat label="Avg loser"     value={fmt$(f.avg_loss_usd)} sub="per loss" color={DOWN} />
              <KStat label="Payoff ratio"  value={`${f.payoff_ratio}×`} sub="avg win ÷ avg loss"
                     color={f.payoff_ratio >= 2 ? UP : "var(--text)"} />
              <KStat label="Profit factor" value={f.profit_factor.toFixed(2)} sub="gross win ÷ gross loss"
                     color={f.profit_factor >= 1.5 ? UP : f.profit_factor >= 1 ? "var(--text)" : DOWN} last />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5">
              <KStat label="Expectancy"      value={`${fmt$(f.expectancy_usd, true)}`} sub="per trade"
                     color={f.expectancy_usd >= 0 ? UP : DOWN} />
              <KStat label="Sharpe"          value={f.sharpe.toFixed(2)} sub="annualised"
                     color={f.sharpe >= 1.5 ? UP : "var(--text)"} />
              <KStat label="Sortino"         value={f.sortino.toFixed(2)} sub="downside only"
                     color={f.sortino >= 2 ? UP : "var(--text)"} />
              <KStat label="Calmar"          value={f.calmar.toFixed(2)} sub="CAGR ÷ max DD"
                     color={f.calmar >= 1 ? UP : "var(--text)"} />
              <KStat label="Recovery factor" value={`${f.recovery_factor}×`} sub="net ÷ max DD"
                     color={f.recovery_factor >= 3 ? UP : "var(--text)"} last />
            </div>
          </div>

          <Card title="16-Year Equity Curve" sub="Monthly cumulative P&L · 2010–2026 · 1 contract">
            <PerfEquityChart data={f.monthly} />
          </Card>

          {/* 3 risk points — read before allocating */}
          <div>
            <h3 className="text-sm font-bold mb-2">Risk profile — read before allocating</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <RiskTile label="Profit concentration" value={`${f.concentration_top5_pct}%`}
                caption={`Top 5% of trades make ${f.concentration_top5_pct}% of gross profit — the edge leans on rare big moves. Miss a few (slippage / downtime / a skipped signal) and the year erodes.`} />
              <RiskTile label="Max consecutive losses" value={`${f.max_consec_losses}`}
                caption={`Longest losing streak. Expect long red stretches before a winner — the real danger is abandoning the strategy mid-streak.`} />
              <RiskTile label="Longest drawdown" value={`${f.days_underwater}d`}
                caption={`Trading days below a prior equity peak (worst DD ${fmt$(f.max_dd_usd)}). You have to be able to hold through it.`} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Expected() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [active, setActive] = useState<StratKey>("all")

  const load = useCallback(async () => {
    const d = await fetchDashboard()
    if (d) setData(d)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])


  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight">Projection</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              How all live + demo strategies would be performing · 2026 YTD &amp; 16y backtest · 1 contract each
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

        {/* ALL — combined book overview + 5-strategy YTD equity */}
        {data?.projections && active === "all" && (
          <>
            <BookProjection projections={data.projections} hideCorrelation />
            {data.projections.ytd_equity && <BookEquityChart eq={data.projections.ytd_equity} />}
          </>
        )}

        {/* SINGLE STRATEGY — projection stats + focused YTD equity line */}
        {data?.projections && active !== "all" && (
          <StrategyProjectionPanel projections={data.projections} k={active} />
        )}


        {/* Strategy correlation — always at the very bottom */}
        {data?.projections && <CorrelationMatrix projections={data.projections} />}
      </main>
    </div>
  )
}
