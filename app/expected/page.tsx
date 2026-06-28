"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, Projections, Strategy16y } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import BookProjection, { CorrelationMatrix } from "@/components/BookProjection"
import RatingLegend from "@/components/RatingLegend"

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
] as const
type StratKey = typeof STRATS[number]["key"]
type StrategyKey = "orb" | "ema" | "dc"   // every tab except "all"
const PER_STRATEGY_NAME: Record<StrategyKey, string> = {
  orb: "ORB", ema: "EMA", dc: "DC",
}

function Skel({ h }: { h: number }) {
  return <div className="animate-pulse rounded" style={{ height: h, background: "var(--surface2)" }} />
}

const fmt$ = (v: number, sign = false) => {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}
type Rating = { stars: number; label: string }
const RATING_LABELS = ["Weak", "Acceptable", "Good", "Very strong", "Elite"]   // index = stars-1
// Institutional (allocator due-diligence) bands [elite, very-strong, good, acceptable]
// → 5/4/3/2★, else 1★ (Weak). Calmar/payoff are house scales (no published tier list).
const RATING_BANDS: Record<string, [number, number, number, number]> = {
  pf:       [3.0, 2.0, 1.5, 1.2],
  payoff:   [3.0, 2.0, 1.5, 1.0],
  sharpe:   [3.0, 2.0, 1.5, 1.0],
  sortino:  [4.0, 3.0, 2.0, 1.5],
  calmar:   [3.0, 2.0, 1.0, 0.5],
  recovery: [5.0, 3.0, 2.0, 1.0],
}
function rateRatio(metric: keyof typeof RATING_BANDS, v: number): Rating {
  const [e, s, so, m] = RATING_BANDS[metric]
  const stars = v >= e ? 5 : v >= s ? 4 : v >= so ? 3 : v >= m ? 2 : 1
  return { stars, label: RATING_LABELS[stars - 1] }
}
// Inverse rating for risk metrics — LOWER is better. Bands [5★ if <a … 1★ if ≥d].
const RISK_BANDS: Record<string, [number, number, number, number]> = {
  concentration: [25, 40, 55, 70],    // % of profit in top-5% of trades/days
  streak_trades: [6, 10, 16, 25],     // consecutive losing trades (per strategy)
  streak_days:   [4, 7, 11, 16],      // consecutive losing days (book)
  underwater:    [60, 180, 365, 730], // trading days below a prior peak
}
function rateInverse(metric: keyof typeof RISK_BANDS, v: number): Rating {
  const [a, b, c, d] = RISK_BANDS[metric]
  const stars = v < a ? 5 : v < b ? 4 : v < c ? 3 : v < d ? 2 : 1
  return { stars, label: RATING_LABELS[stars - 1] }
}
function StarRow({ rating }: { rating: Rating }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <span className="text-xs leading-none tracking-tighter">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ color: i < rating.stars ? "#FBBF24" : "#374151" }}>★</span>
        ))}
      </span>
      <span className="text-[10px]" style={{ color: "var(--muted)" }}>{rating.label}</span>
    </div>
  )
}

function KStat({ label, value, sub, color, last, rating }: {
  label: string; value: string; sub?: string; color?: string; last?: boolean; rating?: Rating
}) {
  return (
    <div className="p-4 flex flex-col gap-1"
         style={{ borderRight: last ? "none" : "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>}
      {rating && <StarRow rating={rating} />}
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

function RiskTile({ label, value, caption, rating }: {
  label: string; value: string; caption: string; rating?: Rating
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-black tabular-nums" style={{ color: "#fbbf24" }}>{value}</p>
      {rating && <StarRow rating={rating} />}
      <p className="text-xs leading-snug" style={{ color: "var(--muted)" }}>{caption}</p>
    </div>
  )
}

// Combined-book 16y block (All tab). Stats are per-TRADING-DAY (the book has no
// unified trades), so labels differ from the per-strategy trade-basis block.
function BookStatBlock({ b }: { b: Strategy16y }) {
  return (
    <div className="space-y-4 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">Combined Book — Full 16-Year Backtest</h2>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {b.n_trades.toLocaleString()} trading days · 2010–2026 · net {fmt$(b.total_usd, true)} · per-day basis
        </span>
      </div>

      <div className="rounded-xl overflow-hidden"
           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="grid grid-cols-2 sm:grid-cols-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <KStat label="Daily win rate" value={`${b.win_rate}%`} sub="% profitable days" />
          <KStat label="Avg up day"      value={fmt$(b.avg_win_usd, true)} sub="per green day" color={UP} />
          <KStat label="Avg down day"    value={fmt$(b.avg_loss_usd)} sub="per red day" color={DOWN} />
          <KStat label="Daily payoff"    value={`${b.payoff_ratio}×`} sub="up ÷ down day"
                 color={b.payoff_ratio >= 2 ? UP : "var(--text)"} rating={rateRatio("payoff", b.payoff_ratio)} />
          <KStat label="Profit factor"   value={b.profit_factor.toFixed(2)} sub="gross up ÷ gross down"
                 color={b.profit_factor >= 1.5 ? UP : DOWN} rating={rateRatio("pf", b.profit_factor)} last />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5">
          <KStat label="Daily expectancy" value={fmt$(b.expectancy_usd, true)} sub="mean / day"
                 color={b.expectancy_usd >= 0 ? UP : DOWN} />
          <KStat label="Sharpe"           value={b.sharpe.toFixed(2)} sub="annualised"
                 color={b.sharpe >= 1.5 ? UP : "var(--text)"} rating={rateRatio("sharpe", b.sharpe)} />
          <KStat label="Sortino"          value={b.sortino.toFixed(2)} sub="downside only"
                 color={b.sortino >= 2 ? UP : "var(--text)"} rating={rateRatio("sortino", b.sortino)} />
          <KStat label="Calmar"           value={b.calmar.toFixed(2)} sub="CAGR ÷ max DD"
                 color={b.calmar >= 1 ? UP : "var(--text)"} rating={rateRatio("calmar", b.calmar)} />
          <KStat label="Recovery factor"  value={`${b.recovery_factor}×`} sub="net ÷ max DD"
                 color={b.recovery_factor >= 3 ? UP : "var(--text)"}
                 rating={rateRatio("recovery", b.recovery_factor)} last />
        </div>
      </div>

      <Card title="16-Year Book Equity Curve" sub="Monthly cumulative P&L · all 5 · 1 contract each">
        <PerfEquityChart data={b.monthly} />
      </Card>

      <div>
        <h3 className="text-sm font-bold mb-2">Book risk profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RiskTile label="Up-day concentration" value={`${b.concentration_top5_pct}%`}
            rating={rateInverse("concentration", b.concentration_top5_pct)}
            caption={`Top 5% of green days make ${b.concentration_top5_pct}% of gross gains — even diversified, the book leans on its best days.`} />
          <RiskTile label="Max consecutive down days" value={`${b.max_consec_losses}`}
            rating={rateInverse("streak_days", b.max_consec_losses)}
            caption={`Longest run of losing days for the whole book. Diversification shortens it vs any single strategy, but expect red stretches.`} />
          <RiskTile label="Longest drawdown" value={`${b.days_underwater}d`}
            rating={rateInverse("underwater", b.days_underwater)}
            caption={`Trading days the book spent below a prior peak (worst DD ${fmt$(b.max_dd_usd)}).`} />
        </div>
      </div>
    </div>
  )
}

// Rated trade-basis stat grid — shared by the YTD (top) and 16y (bottom) halves.
function StratStatGrid({ s }: { s: Strategy16y }) {
  return (
    <div className="rounded-xl overflow-hidden"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="grid grid-cols-2 sm:grid-cols-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <KStat label="Win rate"      value={`${s.win_rate}%`} sub="hit rate" />
        <KStat label="Avg winner"    value={fmt$(s.avg_win_usd, true)} sub="per win" color={UP} />
        <KStat label="Avg loser"     value={fmt$(s.avg_loss_usd)} sub="per loss" color={DOWN} />
        <KStat label="Payoff ratio"  value={`${s.payoff_ratio}×`} sub="avg win ÷ avg loss"
               color={s.payoff_ratio >= 2 ? UP : "var(--text)"} rating={rateRatio("payoff", s.payoff_ratio)} />
        <KStat label="Profit factor" value={s.profit_factor.toFixed(2)} sub="gross win ÷ gross loss"
               color={s.profit_factor >= 1.5 ? UP : s.profit_factor >= 1 ? "var(--text)" : DOWN}
               rating={rateRatio("pf", s.profit_factor)} last />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5">
        <KStat label="Expectancy"      value={fmt$(s.expectancy_usd, true)} sub="per trade"
               color={s.expectancy_usd >= 0 ? UP : DOWN} />
        <KStat label="Sharpe"          value={s.sharpe.toFixed(2)} sub="annualised"
               color={s.sharpe >= 1.5 ? UP : "var(--text)"} rating={rateRatio("sharpe", s.sharpe)} />
        <KStat label="Sortino"         value={s.sortino.toFixed(2)} sub="downside only"
               color={s.sortino >= 2 ? UP : "var(--text)"} rating={rateRatio("sortino", s.sortino)} />
        <KStat label="Calmar"          value={s.calmar.toFixed(2)} sub="CAGR ÷ max DD"
               color={s.calmar >= 1 ? UP : "var(--text)"} rating={rateRatio("calmar", s.calmar)} />
        <KStat label="Recovery factor" value={`${s.recovery_factor}×`} sub="net ÷ max DD"
               color={s.recovery_factor >= 3 ? UP : "var(--text)"}
               rating={rateRatio("recovery", s.recovery_factor)} last />
      </div>
    </div>
  )
}

function StrategyProjectionPanel({ projections, k }: { projections: Projections; k: StrategyKey }) {
  const s = projections.per_strategy.find(p => p.name === PER_STRATEGY_NAME[k])
  const f = projections.strategy_16y?.[k]
  const y = projections.strategy_ytd?.[k]
  return (
    <div className="space-y-5">
      {/* ── TOP HALF · 2026 YTD ── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold">2026 YTD</h2>
          {s && <span className="text-xs" style={{ color: "var(--muted)" }}>{s.instrument} · {s.direction.replace("-", " ")}</span>}
        </div>
        {y && (
          <>
            <StratStatGrid s={y} />
            <p className="text-[11px] -mt-1" style={{ color: "var(--muted)" }}>
              {y.n_trades} trades in 2026 · net {fmt$(y.total_usd, true)} · small-sample — ratings noisier than the 16y block below
            </p>
          </>
        )}
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

          <StratStatGrid s={f} />

          <Card title="16-Year Equity Curve" sub="Monthly cumulative P&L · 2010–2026 · 1 contract">
            <PerfEquityChart data={f.monthly} />
          </Card>

          {/* 3 risk points — read before allocating */}
          <div>
            <h3 className="text-sm font-bold mb-2">Risk profile — read before allocating</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <RiskTile label="Profit concentration" value={`${f.concentration_top5_pct}%`}
                rating={rateInverse("concentration", f.concentration_top5_pct)}
                caption={`Top 5% of trades make ${f.concentration_top5_pct}% of gross profit — the edge leans on rare big moves. Miss a few (slippage / downtime / a skipped signal) and the year erodes.`} />
              <RiskTile label="Max consecutive losses" value={`${f.max_consec_losses}`}
                rating={rateInverse("streak_trades", f.max_consec_losses)}
                caption={`Longest losing streak. Expect long red stretches before a winner — the real danger is abandoning the strategy mid-streak.`} />
              <RiskTile label="Longest drawdown" value={`${f.days_underwater}d`}
                rating={rateInverse("underwater", f.days_underwater)}
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
            {data.projections.book_16y && <BookStatBlock b={data.projections.book_16y} />}
          </>
        )}

        {/* SINGLE STRATEGY — projection stats + focused YTD equity line */}
        {data?.projections && active !== "all" && (
          <StrategyProjectionPanel projections={data.projections} k={active} />
        )}


        {/* Strategy correlation — always at the very bottom */}
        {data?.projections && <CorrelationMatrix projections={data.projections} />}

        {/* ★ rating reference scale */}
        {data && <RatingLegend />}
      </main>
    </div>
  )
}
