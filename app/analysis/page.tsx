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
type ComboKey = "ema" | "orb" | "overnight" | "dc"
type Contracts = Record<ComboKey, number>

const COMBO_LABELS: Record<ComboKey, string> = {
  orb:       "ORB 30m",
  ema:       "EMA Cross 5m",
  dc:        "DC MeanRev",
  overnight: "Overnight",
}
const COMBOS: ComboKey[] = ["orb", "ema", "dc", "overnight"]

// ── curve helpers ────────────────────────────────────────────────────────────

function buildCombinedCurve(
  curve: EquityPoint[],
  selected: Set<ComboKey>,
  contracts: Contracts,
): EquityPoint[] {
  return curve.map(pt => {
    let combined = 0
    if (selected.has("ema"))       combined += (pt.ema       ?? 0) * contracts.ema
    if (selected.has("orb"))       combined += (pt.orb       ?? 0) * contracts.orb
    if (selected.has("dc"))        combined += (pt.dc        ?? 0) * contracts.dc
    if (selected.has("overnight")) combined += (pt.overnight ?? 0) * contracts.overnight
    return { ...pt, combined }
  })
}

// Derive stats from the combined curve's daily dollar increments.
// Curve values are already in $ (1 MNQ = $2/pt applied server-side).
function computeScaledStats(
  curve: EquityPoint[],
  selected: Set<ComboKey>,
  contracts: Contracts,
): PortfolioStats {
  const daily = curve.map((pt, i) => {
    const prev = curve[i - 1]
    let d = 0
    if (selected.has("ema"))       d += ((pt.ema       ?? 0) - (prev?.ema       ?? 0)) * contracts.ema
    if (selected.has("orb"))       d += ((pt.orb       ?? 0) - (prev?.orb       ?? 0)) * contracts.orb
    if (selected.has("dc"))        d += ((pt.dc        ?? 0) - (prev?.dc        ?? 0)) * contracts.dc
    if (selected.has("overnight")) d += ((pt.overnight ?? 0) - (prev?.overnight ?? 0)) * contracts.overnight
    return d
  })

  const active = daily.filter(d => d !== 0)
  if (active.length === 0) {
    return { pf: 0, sharpe: 0, max_dd_usd: 0, win_pct: 0, total_pts: 0, total_usd: 0, trade_days: 0 }
  }

  const wins   = active.filter(d => d > 0).reduce((a, b) => a + b, 0)
  const losses = Math.abs(active.filter(d => d < 0).reduce((a, b) => a + b, 0))
  const pf     = losses > 0 ? Math.min(wins / losses, 99) : 99

  const total_usd = daily.reduce((a, b) => a + b, 0)
  const total_pts = total_usd / 2

  const mean = active.reduce((a, b) => a + b, 0) / active.length
  const std  = Math.sqrt(active.reduce((a, b) => a + (b - mean) ** 2, 0) / active.length)
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0

  let cum = 0, peak = 0, maxDD = 0
  for (const d of daily) { cum += d; peak = Math.max(peak, cum); maxDD = Math.max(maxDD, peak - cum) }

  return {
    pf:         parseFloat(pf.toFixed(2)),
    sharpe:     parseFloat(sharpe.toFixed(2)),
    max_dd_usd: parseFloat(maxDD.toFixed(0)),
    win_pct:    parseFloat((100 * active.filter(d => d > 0).length / active.length).toFixed(1)),
    total_pts:  parseFloat(total_pts.toFixed(1)),
    total_usd:  parseFloat(total_usd.toFixed(0)),
    trade_days: active.length,
  }
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

// ── star rating system ────────────────────────────────────────────────────────

interface Rating { stars: number; label: string }

function rateMetric(metric: "pf" | "sharpe" | "maxdd" | "winpct", value: number, capital = 25000): Rating {
  switch (metric) {
    case "pf":
      if (value >= 2.5) return { stars: 5, label: "Excellent" }
      if (value >= 1.8) return { stars: 4, label: "Strong" }
      if (value >= 1.3) return { stars: 3, label: "Solid" }
      if (value >= 1.0) return { stars: 2, label: "Marginal" }
      return { stars: 1, label: "Poor" }
    case "sharpe":
      if (value >= 3.0) return { stars: 5, label: "Excellent" }
      if (value >= 2.0) return { stars: 4, label: "Strong" }
      if (value >= 1.5) return { stars: 3, label: "Solid" }
      if (value >= 1.0) return { stars: 2, label: "Marginal" }
      return { stars: 1, label: "Poor" }
    case "maxdd": {
      const pct = (value / capital) * 100
      if (pct < 5)  return { stars: 5, label: "Excellent" }
      if (pct < 10) return { stars: 4, label: "Strong" }
      if (pct < 15) return { stars: 3, label: "Acceptable" }
      if (pct < 25) return { stars: 2, label: "Elevated" }
      return { stars: 1, label: "High" }
    }
    case "winpct":
      if (value >= 60) return { stars: 5, label: "Excellent" }
      if (value >= 55) return { stars: 4, label: "Strong" }
      if (value >= 50) return { stars: 3, label: "Solid" }
      if (value >= 45) return { stars: 2, label: "Marginal" }
      return { stars: 1, label: "Low" }
  }
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

function ComboStats({ stats, capital }: { stats: PortfolioStats; capital: number }) {
  const dd = stats.max_dd_usd
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
      <StatPill label="Profit Factor" value={stats.pf?.toFixed(2) ?? "—"}
                color={stats.pf >= 1.5 ? "var(--up)" : stats.pf >= 1.0 ? "#f59e0b" : "var(--down)"}
                rating={rateMetric("pf", stats.pf ?? 0)} />
      <StatPill label="Sharpe" value={stats.sharpe?.toFixed(2) ?? "—"}
                color={stats.sharpe >= 2 ? "var(--up)" : stats.sharpe >= 1 ? "#f59e0b" : "var(--down)"}
                rating={rateMetric("sharpe", stats.sharpe ?? 0)} />
      <StatPill label="Max DD" value={`-$${Math.abs(dd).toLocaleString()}`}
                color="var(--down)"
                rating={rateMetric("maxdd", Math.abs(dd), capital)} />
      <StatPill label="Win %" value={`${stats.win_pct?.toFixed(1)}%`}
                rating={rateMetric("winpct", stats.win_pct ?? 0)} />
      <StatPill label="Total pts" value={`${(stats.total_pts ?? 0) >= 0 ? "+" : ""}${stats.total_pts?.toFixed(1)}`}
                color={(stats.total_pts ?? 0) >= 0 ? "var(--up)" : "var(--down)"} />
      <StatPill label="Total $" value={`${(stats.total_usd ?? 0) >= 0 ? "+" : ""}$${Math.abs(stats.total_usd ?? 0).toLocaleString()}`}
                color={(stats.total_usd ?? 0) >= 0 ? "var(--up)" : "var(--down)"} />
      <StatPill label="Trade days" value={`${stats.trade_days}`} />
    </div>
  )
}

// ── contract stepper ─────────────────────────────────────────────────────────

function ContractStepper({
  label, value, onChange,
}: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <span className="text-xs font-semibold min-w-[80px]" style={{ color: "var(--muted)" }}>{label}</span>
      <button onClick={() => onChange(Math.max(1, value - 1))}
              className="w-6 h-6 rounded flex items-center justify-center text-sm font-black leading-none transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
        −
      </button>
      <span className="text-sm font-black w-4 text-center" style={{ color: "var(--text)" }}>{value}</span>
      <button onClick={() => onChange(Math.min(10, value + 1))}
              className="w-6 h-6 rounded flex items-center justify-center text-sm font-black leading-none transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
        +
      </button>
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {value === 1 ? "contract" : "contracts"}
      </span>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function Analysis() {
  const [data, setData]           = useState<DashboardData | null>(null)
  const [capital, setCapital]     = useState("25000")
  const [period, setPeriod]       = useState<Period>("YTD")
  const [from, setFrom]           = useState("2026-01-01")
  const [to, setTo]               = useState(new Date().toISOString().slice(0, 10))
  const [selected, setSelected]   = useState<Set<ComboKey>>(new Set(["orb", "ema", "dc"]))
  const [contracts, setContracts] = useState<Contracts>({ orb: 1, ema: 1, dc: 1, overnight: 1 })

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
    setContracts({ orb: 1, ema: 1, dc: 1, overnight: 1 })
  }

  const cap = parseFloat(capital.replace(/,/g, "")) || 25000

  const scaledCurve = useMemo(
    () => data ? buildCombinedCurve(data.oos_equity_curve, selected, contracts) : [],
    [data, selected, contracts],
  )
  const filtered  = useMemo(() => filterCurve(scaledCurve, period, from, to), [scaledCurve, period, from, to])
  const rebased   = useMemo(() => rebase(filtered, cap), [filtered, cap])
  const stats     = useMemo(
    () => data ? computeScaledStats(data.oos_equity_curve, selected, contracts) : null,
    [data, selected, contracts],
  )

  const isScaled = COMBOS.some(k => selected.has(k) && (contracts[k] ?? 1) > 1)
  const PERIODS: Period[] = ["1W", "1M", "3M", "YTD", "ALL", "CUSTOM"]

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <h1 className="text-xl font-black">Analysis</h1>

        <div className="rounded-xl p-5 space-y-4"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

          {/* ── combination toggles ── */}
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
                            background: on ? (shelved ? "#2a2212" : "var(--accent2)") : "var(--surface2)",
                            color:      on ? (shelved ? "#f59e0b"  : "#fff")           : "var(--muted)",
                            border: `1px solid ${on ? (shelved ? "#78350f" : "var(--accent2)") : "var(--border)"}`,
                          }}>
                    {COMBO_LABELS[key]}
                    {shelved && <span className="ml-1.5 text-xs opacity-70">(shelved)</span>}
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

          {/* ── contract size per selected strategy ── */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>
              SCALE UP · MNQ CONTRACTS PER STRATEGY
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

          {/* ── period + capital ── */}
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

          {/* ── stats ── */}
          {stats && <ComboStats stats={stats} capital={cap} />}

          {/* ── chart ── */}
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

        {/* ── strategy cards ── */}
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

        {/* ── research discipline: what we tested & rejected ── */}
        {data?.research_discipline && (
          <div className="mt-8">
            <h2 className="text-sm font-bold mb-1">Research Discipline · What We Tested &amp; Rejected</h2>
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              {data.research_discipline.headline}
              {" · "}
              <span style={{ color: "var(--fg)" }}>
                ${data.research_discipline.research_spend_usd.toLocaleString()} research spend
              </span>
              {" · the cost of "}<em>knowing</em>{", not guessing"}
            </p>
            <div className="rounded border" style={{ borderColor: "var(--border)" }}>
              {data.research_discipline.tested_rejected.map((r, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row gap-1 sm:gap-3 px-3 py-2 text-xs border-b last:border-b-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="font-semibold sm:w-64 shrink-0">
                    <span style={{ color: "var(--down, #e5484d)" }}>✗</span> {r.idea}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{r.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
