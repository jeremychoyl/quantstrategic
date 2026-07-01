"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, RiskBlock, Strategy16y } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import CorrelationMatrix from "@/components/CorrelationMatrix"

const DrawdownChart = dynamic(
  () => import("@/components/RiskCharts").then(m => ({ default: m.DrawdownChart })),
  { ssr: false, loading: () => <Skel h={240} /> }
)

const UP = "#00d4aa", DOWN = "#ff4d6d", WARN = "#f59e0b"

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

function Tile({ label, value, caption, color }: {
  label: string; value: string; caption: string; color?: string
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-black tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
      <p className="text-xs leading-snug" style={{ color: "var(--muted)" }}>{caption}</p>
    </div>
  )
}

function StrategyRiskTable({ risk }: { risk: RiskBlock }) {
  return (
    <Card title="Per-Strategy Risk" sub="16-year backtest, ungated · MNQ 1 contract · daily P&L basis">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Strategy", "Daily VaR 95%", "Expected shortfall", "Daily vol", "Worst day", "Max drawdown", "Days"].map((h, i) => (
                <th key={h} className={`pb-2 text-xs font-semibold ${i === 0 ? "text-left" : "text-right"} pr-5`}
                    style={{ color: "var(--muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risk.per_strategy.map(s => (
              <tr key={s.name} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="py-3 pr-5 text-sm font-bold" style={{ color: "var(--text)" }}>{s.name}</td>
                <td className="py-3 pr-5 text-sm tabular-nums text-right" style={{ color: DOWN }}>{fmt$(s.var95_usd)}</td>
                <td className="py-3 pr-5 text-sm tabular-nums text-right" style={{ color: DOWN }}>{fmt$(s.cvar95_usd)}</td>
                <td className="py-3 pr-5 text-sm tabular-nums text-right" style={{ color: "var(--text)" }}>{fmt$(s.daily_vol_usd)}</td>
                <td className="py-3 pr-5 text-sm tabular-nums text-right" style={{ color: DOWN }}>{fmt$(s.worst_day_usd)}</td>
                <td className="py-3 pr-5 text-sm tabular-nums text-right font-semibold" style={{ color: DOWN }}>{fmt$(s.max_dd_usd)}</td>
                <td className="py-3 text-sm tabular-nums text-right" style={{ color: "var(--muted)" }}>{s.n_days.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>
        ORB&apos;s ungated max drawdown ({fmt$(risk.per_strategy.find(s => s.name === "ORB")?.max_dd_usd ?? 0)}) is the
        pre-2021 period where its edge was absent — exactly why the live book runs ORB behind the
        trailing-PF gate, which sits it out in unfavourable regimes.
      </p>
    </Card>
  )
}

export default function Risk() {
  const [data, setData] = useState<DashboardData | null>(null)

  const load = useCallback(async () => {
    const d = await fetchDashboard()
    if (d) setData(d)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  const risk = data?.projections?.risk
  const book16y: Strategy16y | undefined = data?.projections?.book_16y

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-black tracking-tight">Risk</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Downside, drawdown, and diversification of the ORB + EMA + DC book · 3 live MNQ · 1 contract each
          </p>
        </div>

        {!data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><Skel h={120} /><Skel h={120} /><Skel h={120} /><Skel h={120} /></div>
            <Skel h={300} /><Skel h={220} />
          </div>
        )}

        {data && !risk && (
          <div className="rounded-xl p-6 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
            Risk data not yet published. Run <code>compute_projections.py</code> then <code>dashboard_push.py</code>.
          </div>
        )}

        {risk && (
          <>
            {/* ── Value at Risk ── */}
            <div>
              <h2 className="text-sm font-bold mb-2">Value at Risk — daily, 16-year backtest</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile label="VaR 95%" value={fmt$(risk.book.var95_usd)} color={DOWN}
                  caption="On the worst 1 day in 20, the book loses at least this much." />
                <Tile label="VaR 99%" value={fmt$(risk.book.var99_usd)} color={DOWN}
                  caption="On the worst 1 day in 100, it loses at least this much." />
                <Tile label="Expected shortfall 95%" value={fmt$(risk.book.cvar95_usd)} color={DOWN}
                  caption="Average loss on the days beyond the 95% VaR — the size of a bad tail day." />
                <Tile label="Annualised volatility" value={fmt$(risk.book.ann_vol_usd)} color={WARN}
                  caption={`Daily P&L σ of ${fmt$(risk.book.daily_vol_usd)}, scaled ×√252.`} />
              </div>
            </div>

            {/* ── Drawdown ── */}
            <Card title="Drawdown (underwater) curve"
                  sub={`Monthly worst underwater vs prior equity peak · ${risk.book.n_days.toLocaleString()} trading days, 2010–2026 · ungated backtest`}>
              <DrawdownChart data={risk.drawdown_curve} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <Tile label="Max drawdown (ungated 16y)" value={fmt$(risk.book.max_dd_usd)} color={DOWN}
                  caption="Deepest peak-to-trough on the raw backtest — before the live PF-gate." />
                <Tile label="Max drawdown (deployed)" value={fmt$(risk.book.gated_max_dd_usd)} color={WARN}
                  caption="The live trailing-PF gate sits legs out in bad regimes, cutting realized DD." />
                <Tile label="Worst / best day" value={`${fmt$(risk.book.worst_day_usd)} / ${fmt$(risk.book.best_day_usd, true)}`}
                  caption="Single-day extremes across the 16-year book." />
              </div>
            </Card>

            {/* ── Correlation ── */}
            <CorrelationMatrix risk={risk} />

            {/* ── Per-strategy risk ── */}
            <StrategyRiskTable risk={risk} />

            {/* ── Structural risk profile (from the trusted book_16y block) ── */}
            {book16y && (
              <Card title="Structural risk profile" sub="Concentration, losing streaks, and time-underwater of the combined book">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Tile label="Up-day concentration" value={`${book16y.concentration_top5_pct}%`} color={WARN}
                    caption={`The top 5% of green days make ${book16y.concentration_top5_pct}% of gross gains — even diversified, the book leans on its best days.`} />
                  <Tile label="Max consecutive down days" value={`${book16y.max_consec_losses}`} color={WARN}
                    caption="Longest run of losing days for the whole book — expect red stretches; the danger is abandoning mid-streak." />
                  <Tile label="Longest drawdown" value={`${book16y.days_underwater}d`} color={WARN}
                    caption="Trading days spent below a prior equity peak. You have to be able to hold through it." />
                </div>
              </Card>
            )}

            {/* ── Live risk controls ── */}
            <Card title="Live risk controls" sub="What actually limits losses on the deployed book">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Tile label="Daily kill switch (2-tier)" value="−500 / −750 pts" color={DOWN}
                  caption="Book-wide circuit breaker: at −500 pts (−$1,000) it blocks new entries; at −750 pts (−$1,500) it flattens all open legs. The hard tier is a catastrophe backstop (dormant across the 16y backtest — effect ≈ $0); day-to-day it caps new risk without cutting winners. Backtested: flatten-at-−500 cost return for no DD benefit." />
                <Tile label="Exposure" value="3 × 1 MNQ" color="var(--text)"
                  caption="One contract per strategy. All three legs are long-biased — the book runs net-long NQ." />
                <Tile label="Min capital" value="$22k"
                  caption={`Margin + drawdown buffer for all 3 strategies (est. deployed DD ${fmt$(risk.book.gated_max_dd_usd)}).`} />
                <Tile label="Diversifier" value="DC" color={UP}
                  caption="DC mean-reversion is the low-correlation leg; ORB & EMA are the correlated momentum pair." />
              </div>
            </Card>

            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Basis: {risk.basis}. VaR/CVaR are historical (empirical percentiles of daily P&L), not parametric.
              {data?.projections?.as_of ? ` Computed ${data.projections.as_of.slice(0, 10)}.` : ""}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
