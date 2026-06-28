"use client"
import { Projections, ProjectionStrategy } from "@/lib/types"

const UP   = "#00d4aa"
const DOWN = "#ff4d6d"

const fmt$ = (v: number, sign = false) => {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}

function isLive(status: string) {
  return status.toLowerCase().startsWith("live")
}

function isDemo(status: string) {
  return status.toLowerCase().startsWith("demo")
}

function StatusPill({ status }: { status: string }) {
  const live = isLive(status)
  const demo = isDemo(status)
  const { bg, color, border, label } = live
    ? { bg: "#1a2a24", color: UP,             border: "#1e3a30", label: "● Live" }
    : demo
    ? { bg: "#2a2810", color: "#fbbf24",      border: "#854d0e", label: "◐ Demo (sandbox)" }
    : { bg: "#16172a", color: "var(--accent2)", border: "#3b337a", label: "✓ Validated — not yet live" }
  return (
    <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
          style={{
            background: bg,
            color,
            border: `1px solid ${border}`,
          }}>
      {label}
    </span>
  )
}

function HeroStat({ label, value, sub, color, last }: {
  label: string; value: string; sub?: string; color?: string; last?: boolean
}) {
  return (
    <div className="p-4 flex flex-col gap-1"
         style={{ borderRight: last ? "none" : "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-xl font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )
}

// correlation cell colour — low corr (good for a book) → teal, high → red
function corrColor(v: number): string {
  const a = Math.min(Math.abs(v), 1)
  if (v >= 0.999) return "rgba(124,106,247,0.18)"     // diagonal
  return a < 0.15 ? `rgba(0,212,170,${0.10 + a})` : `rgba(255,77,109,${0.10 + a * 0.5})`
}

// Standalone correlation matrix — exported so the Projection tab can render it
// at the very bottom (rather than inline within BookProjection).
export function CorrelationMatrix({ projections }: { projections: Projections }) {
  const names = projections.per_strategy.map(s => s.name)
  if (names.length === 0) return null
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-bold mb-0.5">Strategy Correlation</h3>
      <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
        Low cross-correlation drives the book&apos;s diversification benefit
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-1.5" />
              {names.map(n => (
                <th key={n} className="p-1.5 text-[11px] font-semibold" style={{ color: "var(--muted)" }}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map(row => (
              <tr key={row}>
                <td className="p-1.5 text-[11px] font-semibold text-right pr-3" style={{ color: "var(--muted)" }}>{row}</td>
                {names.map(col => {
                  const v = projections.correlation?.[row]?.[col] ?? 0
                  return (
                    <td key={col} className="p-0.5">
                      <div className="w-12 h-9 rounded flex items-center justify-center text-xs font-bold tabular-nums"
                           style={{ background: corrColor(v), color: "var(--text)" }}>
                        {v.toFixed(2)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BookProjection(
  { projections, hideCorrelation }: { projections: Projections; hideCorrelation?: boolean },
) {
  const b = projections.book

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-black tracking-tight">Projected Profit — 3-Strategy Book</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{projections.note}</p>
        <p className="text-xs mt-0.5 font-semibold" style={{ color: "var(--muted)" }}>
          Deployed config — gated (live trailing-PF gate sits legs out in unfavorable regimes).
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          Sharpe uses a business-day basis (×√252) in both views; backtest-vs-deployed differences are the gate, not the calculation.
        </p>
      </div>

      {/* Hero — combined book */}
      <div className="rounded-xl overflow-hidden"
           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="grid grid-cols-2 sm:grid-cols-5">
          <HeroStat label="Avg Annual P&L (16y)" value={fmt$(b.annual_usd, true)} sub={`${projections.n_strategies} strategies · 1 contract each · 2010–2026 mean`}
                    color={b.annual_usd >= 0 ? UP : DOWN} />
          <HeroStat label="Sharpe"      value={b.sharpe.toFixed(2)} sub="annualised · combined"
                    color={b.sharpe >= 1.5 ? UP : "var(--text)"} />
          <HeroStat label="Max Drawdown" value={fmt$(b.max_dd_usd)} sub="combined book · 16y"
                    color={DOWN} />
          <HeroStat label="Calmar"      value={b.calmar.toFixed(2)} sub="CAGR ÷ max DD"
                    color={b.calmar >= 1 ? UP : "var(--text)"} />
          <HeroStat label="Return on Capital"
                    value={`${b.return_on_capital_pct.toFixed(1)}%`}
                    sub={b.margin_usd != null
                      ? `on ${fmt$(b.capital_estimate_usd)} (margin ${fmt$(b.margin_usd)} + DD ${fmt$(b.dd_buffer_usd ?? 0)})`
                      : `on ${fmt$(b.capital_estimate_usd)} capital`}
                    color={b.return_on_capital_pct >= 0 ? UP : DOWN} last />
        </div>
      </div>

      {/* Book Calmar footnote */}
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Calmar 0.92 = gated book annual return ÷ gated max-DD ($3,114). The gate turns legs off in bad regimes, so the book&apos;s drawdown is smaller than an individual ungated leg&apos;s — that&apos;s the gating working, not an error.
      </p>

      {/* Per-strategy breakdown */}
      <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-0.5">Per-Strategy Breakdown</h3>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          16-year backtest · 1 contract each · 3 live MNQ
        </p>

        {/* desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Strategy", "Instrument", "Direction", "Annual $", "Sharpe", "Calmar", "Status"].map((h, i) => (
                  <th key={h} className={`pb-2 text-xs font-semibold ${i >= 3 && i <= 5 ? "text-right" : "text-left"} pr-5`}
                      style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projections.per_strategy.map((s: ProjectionStrategy) => (
                <tr key={s.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-3 pr-5 text-sm font-bold" style={{ color: "var(--text)" }}>{s.name}</td>
                  <td className="py-3 pr-5 text-sm" style={{ color: "var(--text2)" }}>{s.instrument}</td>
                  <td className="py-3 pr-5 text-sm capitalize" style={{ color: "var(--text2)" }}>{s.direction.replace("-", " ")}</td>
                  <td className="py-3 pr-5 text-sm font-bold tabular-nums text-right"
                      style={{ color: s.annual_usd >= 0 ? UP : DOWN }}>{fmt$(s.annual_usd, true)}</td>
                  <td className="py-3 pr-5 text-sm tabular-nums text-right" style={{ color: "var(--text)" }}>{s.sharpe.toFixed(2)}</td>
                  <td className="py-3 pr-5 text-sm tabular-nums text-right" style={{ color: "var(--text)" }}>{s.calmar.toFixed(2)}</td>
                  <td className="py-3 text-right"><StatusPill status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="sm:hidden space-y-3">
          {projections.per_strategy.map((s: ProjectionStrategy) => (
            <div key={s.name} className="rounded-lg p-3"
                 style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold">{s.name}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>
                    {s.instrument} · {s.direction.replace("-", " ")}
                  </span>
                </div>
                <StatusPill status={s.status} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "Annual $", v: fmt$(s.annual_usd, true), c: s.annual_usd >= 0 ? UP : DOWN },
                  { l: "Sharpe",   v: s.sharpe.toFixed(2),       c: "var(--text)" },
                  { l: "Calmar",   v: s.calmar.toFixed(2),       c: "var(--text)" },
                ].map(x => (
                  <div key={x.l}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{x.l}</p>
                    <p className="text-sm font-bold tabular-nums" style={{ color: x.c }}>{x.v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Correlation matrix — suppressed when the page renders it separately at the bottom */}
      {!hideCorrelation && <CorrelationMatrix projections={projections} />}
    </div>
  )
}
