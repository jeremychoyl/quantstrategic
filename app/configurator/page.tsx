"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { DashboardData, BookEquityPoint, PortfolioStats, LiveDayCurve, Sizing } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import StrategyCard from "@/components/StrategyModal"
import RatingLegend from "@/components/RatingLegend"

const AnalysisChart = dynamic(() => import("@/components/AnalysisChart"), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex items-center justify-center text-sm animate-pulse"
         style={{ color: "var(--muted)" }}>Loading chart…</div>
  ),
})

const LiveCurveChart = dynamic(() => import("@/components/LiveCurveChart"), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex items-center justify-center text-sm animate-pulse"
         style={{ color: "var(--muted)" }}>Loading chart…</div>
  ),
})

type DataView = "projected" | "live"
type Period   = "1W" | "1M" | "3M" | "YTD" | "ALL" | "CUSTOM"
type ComboKey = "orb" | "ema" | "dc"
type Contracts = Record<ComboKey, number>

const COMBO_LABELS: Record<ComboKey, string> = {
  orb:   "ORB 30m",
  ema:   "EMA Cross 5m",
  dc:    "DC MeanRev",
}
const COMBOS: ComboKey[] = ["orb", "ema", "dc"]

function buildCombinedCurve(
  curve: BookEquityPoint[],
  selected: Set<ComboKey>,
  contracts: Contracts,
): BookEquityPoint[] {
  return curve.map(pt => {
    let combined = 0
    for (const k of COMBOS) if (selected.has(k)) combined += (pt[k] ?? 0) * contracts[k]
    return { ...pt, combined }
  })
}

// PortfolioStats + the extra rated ratios & risk metrics (all per-trading-day,
// computed live for the selected/scaled combination).
type ScaledStats = PortfolioStats & {
  payoff: number; sortino: number; calmar: number; recovery: number
  concentration: number; max_consec_down: number; days_underwater: number
}
const ZERO_STATS: ScaledStats = {
  pf: 0, sharpe: 0, max_dd_usd: 0, win_pct: 0, total_pts: 0, total_usd: 0, trade_days: 0,
  payoff: 0, sortino: 0, calmar: 0, recovery: 0, concentration: 0, max_consec_down: 0, days_underwater: 0,
}

// Daily P&L (USD) of the scaled combination, with dates — diffs computed on the
// FULL curve so a later period-filter keeps each day's true daily change.
function scaledDaily(
  curve: BookEquityPoint[],
  selected: Set<ComboKey>,
  contracts: Contracts,
): { date: string; d: number }[] {
  return curve.map((pt, i) => {
    const prev = curve[i - 1]
    let d = 0
    for (const k of COMBOS) if (selected.has(k)) d += ((pt[k] ?? 0) - (prev?.[k] ?? 0)) * contracts[k]
    return { date: pt.date, d }
  })
}

function statsFromDaily(rows: { date: string; d: number }[]): ScaledStats {
  const daily = rows.map(r => r.d)
  const active = daily.filter(d => d !== 0)
  if (active.length === 0) return ZERO_STATS

  const ups    = active.filter(d => d > 0)
  const downs  = active.filter(d => d < 0)
  const wins   = ups.reduce((a, b) => a + b, 0)
  const losses = Math.abs(downs.reduce((a, b) => a + b, 0))
  const pf     = losses > 0 ? Math.min(wins / losses, 99) : 99
  const total_usd = daily.reduce((a, b) => a + b, 0)
  const avgUp  = ups.length ? wins / ups.length : 0
  const avgDn  = downs.length ? losses / downs.length : 0
  const payoff = avgDn > 0 ? avgUp / avgDn : 0

  const mean  = active.reduce((a, b) => a + b, 0) / active.length
  const std   = Math.sqrt(active.reduce((a, b) => a + (b - mean) ** 2, 0) / active.length)
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0
  const downDev = Math.sqrt(active.reduce((a, d) => a + Math.min(d, 0) ** 2, 0) / active.length)
  const sortino = downDev > 0 ? (mean / downDev) * Math.sqrt(252) : 0

  let cum = 0, peak = 0, maxDD = 0, under = 0, curUnder = 0, runPeak = -Infinity
  for (const d of daily) {
    cum += d
    peak = Math.max(peak, cum); maxDD = Math.max(maxDD, peak - cum)
    runPeak = Math.max(runPeak, cum)
    if (cum < runPeak) { curUnder++; under = Math.max(under, curUnder) } else curUnder = 0
  }
  // years from the curve's date span (for Calmar annualisation)
  const spanDays = rows.length > 1
    ? (new Date(rows[rows.length - 1].date).getTime() - new Date(rows[0].date).getTime()) / 86400000
    : 365
  const years  = Math.max(spanDays / 365.25, 0.05)
  const calmar = maxDD > 0 ? (total_usd / years) / maxDD : 0
  const recovery = maxDD > 0 ? total_usd / maxDD : 0

  // up-day concentration: top-5% of green days as a share of gross gains
  const sortedUps = [...ups].sort((a, b) => b - a)
  const topN = Math.max(1, Math.floor(0.05 * active.length))
  const concentration = wins > 0 ? 100 * sortedUps.slice(0, topN).reduce((a, b) => a + b, 0) / wins : 0
  // longest run of consecutive down days
  let mcd = 0, curMcd = 0
  for (const d of active) { if (d < 0) { curMcd++; mcd = Math.max(mcd, curMcd) } else curMcd = 0 }

  return {
    pf:         parseFloat(pf.toFixed(2)),
    sharpe:     parseFloat(sharpe.toFixed(2)),
    max_dd_usd: parseFloat(maxDD.toFixed(0)),
    win_pct:    parseFloat((100 * ups.length / active.length).toFixed(1)),
    total_pts:  parseFloat((total_usd / 2).toFixed(1)),
    total_usd:  parseFloat(total_usd.toFixed(0)),
    trade_days: active.length,
    payoff:     parseFloat(payoff.toFixed(1)),
    sortino:    parseFloat(sortino.toFixed(2)),
    calmar:     parseFloat(calmar.toFixed(2)),
    recovery:   parseFloat(recovery.toFixed(2)),
    concentration:   Math.round(concentration),
    max_consec_down: mcd,
    days_underwater: under,
  }
}

function filterCurve<T extends { date: string }>(curve: T[], period: Period, from: string, to: string): T[] {
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

function rebase<T extends { combined: number }>(data: T[], capital: number): (T & { combined_pct: number })[] {
  if (!data.length) return data as (T & { combined_pct: number })[]
  return data.map(d => ({ ...d, combined_pct: (d.combined / capital) * 100 }))
}

interface Rating { stars: number; label: string }
// Institutional (allocator due-diligence) bands. Labels: 1★ Weak → 5★ Elite.
function rateMetric(metric: "pf" | "sharpe" | "maxdd", value: number, capital = 25000): Rating {
  switch (metric) {
    case "pf":
      if (value >= 3.0) return { stars: 5, label: "Elite" }
      if (value >= 2.0) return { stars: 4, label: "Very strong" }
      if (value >= 1.5) return { stars: 3, label: "Good" }
      if (value >= 1.2) return { stars: 2, label: "Acceptable" }
      return { stars: 1, label: "Weak" }
    case "sharpe":
      if (value >= 3.0) return { stars: 5, label: "Elite" }
      if (value >= 2.0) return { stars: 4, label: "Very strong" }
      if (value >= 1.5) return { stars: 3, label: "Good" }
      if (value >= 1.0) return { stars: 2, label: "Acceptable" }
      return { stars: 1, label: "Weak" }
    case "maxdd": {
      const pct = (value / capital) * 100
      if (pct < 10) return { stars: 5, label: "Elite" }
      if (pct < 15) return { stars: 4, label: "Very strong" }
      if (pct < 20) return { stars: 3, label: "Good" }
      if (pct < 30) return { stars: 2, label: "Acceptable" }
      return { stars: 1, label: "Weak" }
    }
  }
}

// Higher-is-better ratio bands (match the Projection tab) + inverse risk bands.
const RATING_LABELS = ["Weak", "Acceptable", "Good", "Very strong", "Elite"]
const RATIO_BANDS: Record<string, [number, number, number, number]> = {
  payoff: [3, 2, 1.5, 1], sortino: [4, 3, 2, 1.5], calmar: [3, 2, 1, 0.5], recovery: [5, 3, 2, 1],
}
function rateRatio(metric: keyof typeof RATIO_BANDS, v: number): Rating {
  const [e, s, so, m] = RATIO_BANDS[metric]
  const stars = v >= e ? 5 : v >= s ? 4 : v >= so ? 3 : v >= m ? 2 : 1
  return { stars, label: RATING_LABELS[stars - 1] }
}
const RISK_BANDS: Record<string, [number, number, number, number]> = {
  concentration: [25, 40, 55, 70], streak_days: [4, 7, 11, 16], underwater: [60, 180, 365, 730],
}
function rateRisk(metric: keyof typeof RISK_BANDS, v: number): Rating {
  const [a, b, c, d] = RISK_BANDS[metric]
  const stars = v < a ? 5 : v < b ? 4 : v < c ? 3 : v < d ? 2 : 1
  return { stars, label: RATING_LABELS[stars - 1] }
}

function StarRow({ rating }: { rating: Rating }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-sm leading-none tracking-tighter">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ color: i < rating.stars ? "#FBBF24" : "#374151" }}>★</span>
        ))}
      </span>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{rating.label}</span>
    </div>
  )
}

function StatPill({ label, value, color, rating }: {
  label: string; value: string; color?: string; rating?: Rating
}) {
  return (
    <div className="rounded-lg px-4 py-3 flex flex-col"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-black mt-0.5" style={{ color: color ?? "var(--text)" }}>{value}</span>
      {rating && <StarRow rating={rating} />}
    </div>
  )
}

const SMALL_SAMPLE_DAYS = 20   // below this, annualised ratio ratings are flagged as noisy

function ComboStats({ stats, capital }: { stats: ScaledStats; capital: number }) {
  const dd = stats.max_dd_usd
  const totalUsd = stats.total_usd ?? 0
  const totalPts = stats.total_pts ?? 0
  const posUsd = totalUsd >= 0
  const posPts = totalPts >= 0
  const totalUsdStr = `${posUsd ? "+" : "−"}$${Math.abs(totalUsd).toLocaleString()}`
  const totalPtsStr = `${posPts ? "+" : "−"}${Math.abs(totalPts).toFixed(1)}`
  return (
    <div className="space-y-2 mt-4">
      {/* HERO — Total $ dominant, secondary stats stacked at right */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 rounded-xl px-5 py-4 flex flex-col justify-center"
             style={{ background: "var(--surface2)",
                      border: `1px solid ${posUsd ? "var(--accent)" : "var(--down)"}`,
                      boxShadow: posUsd ? "0 0 24px rgba(34,197,94,0.18)" : "0 0 24px rgba(239,68,68,0.15)" }}>
          <span className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--muted)" }}>Total P&amp;L</span>
          <span className="text-4xl sm:text-5xl font-black mt-1 leading-none"
                style={{ color: posUsd ? "var(--up)" : "var(--down)" }}>{totalUsdStr}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="rounded-xl px-4 py-2 flex flex-1 flex-col justify-center"
               style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--muted)" }}>Total pts</span>
            <span className="text-lg font-black leading-tight"
                  style={{ color: posPts ? "var(--up)" : "var(--down)" }}>{totalPtsStr}</span>
          </div>
          <div className="rounded-xl px-4 py-2 flex flex-1 flex-col justify-center"
               style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--muted)" }}>Trade days</span>
            <span className="text-lg font-black leading-tight"
                  style={{ color: "var(--text)" }}>{stats.trade_days}</span>
          </div>
        </div>
      </div>

      {/* rated ratios — react to selection / scaling */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill label="Profit Factor" value={stats.pf?.toFixed(2) ?? "—"}
                  color={stats.pf >= 1.5 ? "var(--up)" : stats.pf >= 1.0 ? "#f59e0b" : "var(--down)"}
                  rating={rateMetric("pf", stats.pf ?? 0)} />
        <StatPill label="Payoff" value={`${stats.payoff?.toFixed(1) ?? "—"}×`}
                  color={stats.payoff >= 2 ? "var(--up)" : "var(--text)"}
                  rating={rateRatio("payoff", stats.payoff ?? 0)} />
        <StatPill label="Sharpe" value={stats.sharpe?.toFixed(2) ?? "—"}
                  color={stats.sharpe >= 2 ? "var(--up)" : stats.sharpe >= 1 ? "#f59e0b" : "var(--down)"}
                  rating={rateMetric("sharpe", stats.sharpe ?? 0)} />
        <StatPill label="Sortino" value={stats.sortino?.toFixed(2) ?? "—"}
                  color={stats.sortino >= 2 ? "var(--up)" : "var(--text)"}
                  rating={rateRatio("sortino", stats.sortino ?? 0)} />
        <StatPill label="Calmar" value={stats.calmar?.toFixed(2) ?? "—"}
                  color={stats.calmar >= 1 ? "var(--up)" : "var(--text)"}
                  rating={rateRatio("calmar", stats.calmar ?? 0)} />
        <StatPill label="Recovery" value={`${stats.recovery?.toFixed(2) ?? "—"}×`}
                  color={stats.recovery >= 3 ? "var(--up)" : "var(--text)"}
                  rating={rateRatio("recovery", stats.recovery ?? 0)} />
        <StatPill label="Win %" value={`${stats.win_pct?.toFixed(1)}%`} />
        <StatPill label="Max DD" value={`-$${Math.abs(dd).toLocaleString()}`} color="var(--down)"
                  rating={rateMetric("maxdd", Math.abs(dd), capital)} />
      </div>

      {/* risk profile — inverse rated (lower = better) */}
      <div className="grid grid-cols-3 gap-2">
        <StatPill label="Up-day concentration" value={`${stats.concentration}%`}
                  rating={rateRisk("concentration", stats.concentration)} />
        <StatPill label="Max consec down days" value={`${stats.max_consec_down}`}
                  rating={rateRisk("streak_days", stats.max_consec_down)} />
        <StatPill label="Longest drawdown" value={`${stats.days_underwater}d`}
                  rating={rateRisk("underwater", stats.days_underwater)} />
      </div>

      {/* small-sample footnote — annualised ratio ★ ratings get noisy on short windows */}
      {stats.trade_days > 0 && stats.trade_days < SMALL_SAMPLE_DAYS && (
        <p className="text-[11px] leading-snug" style={{ color: "#f59e0b" }}>
          ⚠ Only {stats.trade_days} trading day{stats.trade_days === 1 ? "" : "s"} in this window — the
          annualised ratios (Sharpe, Sortino, Calmar, recovery) and their ★ ratings are statistically
          noisy at this sample size. Use 3M+ for reliable ratings.
        </p>
      )}
    </div>
  )
}

function ContractStepper({ label, value, onChange }: {
  label: string; value: number; onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <span className="text-xs font-semibold min-w-[80px]" style={{ color: "var(--muted)" }}>{label}</span>
      <button onClick={() => onChange(Math.max(1, value - 1))}
              className="w-6 h-6 rounded flex items-center justify-center text-sm font-black"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
        −
      </button>
      <span className="text-sm font-black w-4 text-center" style={{ color: "var(--text)" }}>{value}</span>
      <button onClick={() => onChange(Math.min(10, value + 1))}
              className="w-6 h-6 rounded flex items-center justify-center text-sm font-black"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
        +
      </button>
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {value === 1 ? "contract" : "contracts"}
      </span>
    </div>
  )
}

function LiveSummaryStats({ curve }: { curve: LiveDayCurve[] }) {
  if (!curve.length) return null
  const last   = curve.at(-1)!
  const days   = curve.length
  const wins   = curve.filter(d => d.day_pnl_usd > 0).length
  const winPct = Math.round((wins / days) * 100)
  const pos    = last.cum_usd >= 0
  const fmtUsd = (v: number, sign = false) => {
    const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
    return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
  }
  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {[
        { label: "Cum P&L",    value: fmtUsd(last.cum_usd, true),   color: pos ? "var(--up)" : "var(--down)" },
        { label: "Trade days", value: `${days}`,                     color: "var(--text)" },
        { label: "Day win %",  value: `${winPct}%`,                  color: winPct >= 50 ? "var(--up)" : "var(--down)" },
      ].map(s => (
        <div key={s.label} className="rounded-lg p-3"
             style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</p>
          <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: s.color }}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Book sizing & capital (16y modeled) — pick any config, see maxDD + min capital ──
function usd0(v: number): string { return `$${Math.round(v).toLocaleString()}` }

function Stepper0({ label, value, max, onChange }: {
  label: string; value: number; max: number; onChange: (n: number) => void
}) {
  const btn = "w-6 h-6 rounded flex items-center justify-center text-sm font-black"
  const bs  = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <span className="text-xs font-semibold min-w-[76px]" style={{ color: "var(--muted)" }}>{label}</span>
      <button className={btn} style={bs} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span className="text-sm font-black w-4 text-center"
            style={{ color: value === 0 ? "var(--muted)" : "var(--text)" }}>{value}</span>
      <button className={btn} style={bs} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  )
}

function SizingCapital({ sizing }: { sizing?: Sizing }) {
  const [cfg, setCfg] = useState<{ orb: number; ema: number; dc: number }>({ orb: 1, ema: 1, dc: 1 })
  const maxC  = sizing?.max_contracts ?? 8
  const entry = useMemo(
    () => sizing?.grid.find(g => g.o === cfg.orb && g.e === cfg.ema && g.d === cfg.dc) ?? null,
    [sizing, cfg])
  if (!sizing) return null

  const total  = cfg.orb + cfg.ema + cfg.dc
  const margin = sizing.margins.orb * cfg.orb + sizing.margins.ema * cfg.ema + sizing.margins.dc * cfg.dc
  const maxdd  = entry?.dd ?? 0
  const minCap = margin + maxdd

  const setOptimal = () => {
    const t = Math.max(1, total)
    const rp = sizing.risk_parity
    const raw: Record<"orb"|"ema"|"dc", number> = { orb: rp.orb * t, ema: rp.ema * t, dc: rp.dc * t }
    const v: Record<"orb"|"ema"|"dc", number> = {
      orb: Math.min(maxC, Math.max(0, Math.round(raw.orb))),
      ema: Math.min(maxC, Math.max(0, Math.round(raw.ema))),
      dc:  Math.min(maxC, Math.max(0, Math.round(raw.dc))),
    }
    const keys = ["orb", "ema", "dc"] as const
    let sum = v.orb + v.ema + v.dc, guard = 0
    while (sum !== t && guard++ < 60) {
      if (sum < t) {
        const k = keys.filter(x => v[x] < maxC).sort((a, b) => (raw[b] - v[b]) - (raw[a] - v[a]))[0]
        if (!k) break; v[k]++; sum++
      } else {
        const k = keys.filter(x => v[x] > 0).sort((a, b) => (v[a] - raw[a]) - (v[b] - raw[b]))[0]
        if (!k) break; v[k]--; sum--
      }
    }
    setCfg(v)
  }

  const tile = (label: string, value: string, color?: string, sub?: string) => (
    <div key={label} className="rounded-lg p-3"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-base font-bold tabular-nums mt-0.5" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )

  return (
    <div className="rounded-xl p-5 space-y-4 mt-4"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
          BOOK SIZING &amp; CAPITAL <span className="opacity-60">· 16y modeled</span>
        </p>
        <div className="flex gap-2">
          <button onClick={setOptimal} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "var(--accent2)", color: "#fff", border: "1px solid var(--accent2)" }}>
            Optimal
          </button>
          <button onClick={() => setCfg({ orb: 1, ema: 1, dc: 1 })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Stepper0 label="ORB 30m"    value={cfg.orb} max={maxC} onChange={n => setCfg(c => ({ ...c, orb: n }))} />
        <Stepper0 label="EMA Cross"  value={cfg.ema} max={maxC} onChange={n => setCfg(c => ({ ...c, ema: n }))} />
        <Stepper0 label="DC MeanRev" value={cfg.dc}  max={maxC} onChange={n => setCfg(c => ({ ...c, dc: n }))} />
        <div className="flex items-center px-2 text-xs" style={{ color: "var(--muted)" }}>
          = <span className="font-black mx-1" style={{ color: "var(--text)" }}>{cfg.orb}-{cfg.ema}-{cfg.dc}</span>
          ({total} contract{total === 1 ? "" : "s"})
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Add at least one contract to size the book.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {tile("Min capital required", usd0(minCap), "var(--text)", `margin ${usd0(margin)} + maxDD`)}
          {tile("Max drawdown (16y)", `−${usd0(maxdd)}`, "var(--down)")}
          {tile("Sharpe", entry ? entry.sh.toFixed(2) : "—")}
          {tile("Calmar", entry?.cal != null ? entry.cal.toFixed(2) : "—")}
          {tile("Annual (16y avg)", entry ? usd0(entry.ann) : "—", "var(--up)")}
        </div>
      )}

      <p className="text-[10px] leading-snug" style={{ color: "var(--muted)" }}>
        16y modeled, ungated worst-case. Min capital = broker margin (ORB/EMA intraday, DC overnight) + the full
        modeled max drawdown buffer. &ldquo;Optimal&rdquo; = risk-parity (inverse-vol) at the current total.
        Margins are estimates — verify against your broker.
      </p>
    </div>
  )
}

export default function Configurator() {
  const [data, setData]           = useState<DashboardData | null>(null)
  const [view, setView]           = useState<DataView>("projected")
  const [capital, setCapital]     = useState("25000")
  const [period, setPeriod]       = useState<Period>("YTD")
  const [from, setFrom]           = useState("2026-01-01")
  const [to, setTo]               = useState(new Date().toISOString().slice(0, 10))
  const [selected, setSelected]   = useState<Set<ComboKey>>(new Set(["orb", "ema", "dc"]))
  const [contracts, setContracts] = useState<Contracts>({ orb: 1, ema: 1, dc: 1 })

  const load = useCallback(async () => {
    const d = await fetchDashboard()
    if (d) setData(d)
  }, [])
  useEffect(() => { load() }, [load])

  const toggle = (key: ComboKey) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) }
      else next.add(key)
      return next
    })
  }

  const updateContract = (key: ComboKey, n: number) =>
    setContracts(prev => ({ ...prev, [key]: n }))

  const reset = () => {
    setSelected(new Set(["orb", "ema", "dc"]))
    setContracts({ orb: 1, ema: 1, dc: 1 })
    setView("projected")
  }

  const cap = parseFloat(capital.replace(/,/g, "")) || 25000

  const ytdSeries = data?.projections?.ytd_equity?.series ?? []
  const scaledCurve = useMemo(
    () => buildCombinedCurve(ytdSeries, selected, contracts),
    [ytdSeries, selected, contracts],
  )
  const filtered  = useMemo(() => filterCurve(scaledCurve, period, from, to), [scaledCurve, period, from, to])
  const rebased   = useMemo(() => rebase(filtered, cap), [filtered, cap])
  // stats now respect the period selector: build daily diffs on the full curve,
  // then filter to the chosen window before computing.
  const dailyRows = useMemo(() => scaledDaily(ytdSeries, selected, contracts), [ytdSeries, selected, contracts])
  const statRows  = useMemo(() => filterCurve(dailyRows, period, from, to), [dailyRows, period, from, to])
  const stats     = useMemo(() => statsFromDaily(statRows), [statRows])

  const liveCurve = data?.live_trades?.daily_curve ?? []
  const isScaled  = COMBOS.some(k => selected.has(k) && (contracts[k] ?? 1) > 1)
  const PERIODS: Period[] = ["1W", "1M", "3M", "YTD", "ALL", "CUSTOM"]
  const hasLive   = liveCurve.length > 0

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-black">Strategies</h1>

          {/* Projected / Live toggle */}
          <div className="flex gap-1 rounded-lg p-1"
               style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            {(["projected", "live"] as DataView[]).map(v => {
              const label = v === "projected" ? "Projected (backtest)" : "Live (actual fills)"
              const disabled = v === "live" && !hasLive
              return (
                <button key={v} onClick={() => !disabled && setView(v)}
                        disabled={disabled}
                        className="px-4 py-1.5 rounded text-sm font-semibold transition-all"
                        style={{
                          background: view === v ? "var(--accent2)" : "transparent",
                          color:      view === v ? "#fff" : disabled ? "var(--border)" : "var(--text2)",
                          cursor:     disabled ? "not-allowed" : "pointer",
                        }}>
                  {label}
                  {disabled && <span className="ml-1 text-[10px]">(no data yet)</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl p-5 space-y-4"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

          {/* Combination toggles — only shown in projected mode */}
          {view === "projected" && (
            <>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>PORTFOLIO COMBINATION</p>
                <div className="flex flex-wrap gap-2">
                  {COMBOS.map(key => {
                    const on = selected.has(key)
                    return (
                      <button key={key} onClick={() => toggle(key)}
                              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                              style={{
                                background: on ? "var(--accent2)" : "var(--surface2)",
                                color:      on ? "#fff" : "var(--muted)",
                                border: `1px solid ${on ? "var(--accent2)" : "var(--border)"}`,
                              }}>
                        {COMBO_LABELS[key]}
                      </button>
                    )
                  })}
                  <button onClick={reset}
                          className="px-3 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                    Reset
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>
                  SCALE UP · CONTRACTS PER STRATEGY
                  {isScaled && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold"
                          style={{ background: "#1a2a24", color: "var(--up)" }}>
                      SCALED
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMBOS.filter(k => selected.has(k)).map(key => (
                    <ContractStepper key={key}
                      label={COMBO_LABELS[key]}
                      value={contracts[key]}
                      onChange={n => updateContract(key, n)} />
                  ))}
                </div>
              </div>

              <div className="h-px" style={{ background: "var(--border)" }} />

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
                                color:      period === p ? "#fff"           : "var(--muted)",
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

              {stats && <ComboStats stats={stats} capital={cap} />}

              <SizingCapital sizing={data?.projections?.sizing} />


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
            </>
          )}

          {/* Live view */}
          {view === "live" && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--muted)" }}>
                LIVE EQUITY CURVE · Actual fills since {data?.live_since ?? "go-live"}
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                All 3 strategies combined · 1 MNQ each
              </p>
              <LiveCurveChart data={liveCurve} />
              <LiveSummaryStats curve={liveCurve} />
            </div>
          )}
        </div>

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

        {/* ★ rating reference scale */}
        {data && <RatingLegend />}
      </main>
    </div>
  )
}
