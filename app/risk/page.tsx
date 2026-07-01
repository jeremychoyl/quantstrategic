"use client"
import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { DashboardData, RiskBlock, Strategy16y } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"

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

// Honest co-active correlation cell colour: teal below the gate, amber/red at or
// above it. Thin samples are dimmed (see the n annotation below the matrix).
function corrColor(v: number | null, gate: number, thin: boolean): string {
  if (v === null) return "var(--surface2)"
  if (v >= 0.999) return "rgba(124,106,247,0.18)"      // diagonal
  const a = Math.min(Math.abs(v), 1)
  const base = a >= gate
    ? `rgba(245,158,11,${0.15 + a * 0.5})`             // ≥ gate → amber
    : `rgba(0,212,170,${0.10 + a})`                    // < gate → teal
  return thin ? base.replace(/[\d.]+\)$/, "0.12)") : base
}

function CorrelationMatrix({ risk }: { risk: RiskBlock }) {
  const names = Object.keys(risk.correlation_coactive)
  if (!names.length) return null
  const gate = risk.gate
  const minN = risk.min_reliable_n
  const breached = names.flatMap(a =>
    names.filter(b => a < b).map(b => ({ a, b, v: risk.correlation_coactive[a]?.[b], n: risk.coactive_n[a]?.[b] ?? 0 }))
  ).filter(p => p.v !== null && Math.abs(p.v as number) >= gate && (p.n ?? 0) >= minN)

  return (
    <Card title="Strategy Correlation — co-active daily P&L"
          sub={`Pearson correlation over days both legs traded, 16-year backtest. Gate: |corr| < ${gate.toFixed(2)}. This is the honest diversification read (the same method as the live /corr monitor).`}>
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
                  const v = risk.correlation_coactive[row]?.[col] ?? null
                  const n = risk.coactive_n[row]?.[col] ?? 0
                  const thin = row !== col && n < minN
                  return (
                    <td key={col} className="p-0.5">
                      <div className="w-14 h-11 rounded flex flex-col items-center justify-center"
                           style={{ background: corrColor(v, gate, thin), color: "var(--text)" }}>
                        <span className="text-xs font-bold tabular-nums">
                          {v === null ? "—" : v.toFixed(2)}
                        </span>
                        {row !== col && (
                          <span className="text-[9px]" style={{ color: thin ? WARN : "var(--muted)" }}>
                            n={n}{thin ? "*" : ""}
                          </span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>
        <span style={{ color: WARN }}>*</span> Thin sample (n &lt; {minN} co-active days) — DC fires ~17×/yr,
        so any pair with DC can&apos;t be estimated reliably yet; rely on the robust pairs.
      </p>

      {breached.length > 0 ? (
        <div className="mt-3 rounded-lg p-3 text-xs leading-relaxed"
             style={{ background: "#2a1a10", border: "1px solid #854d0e", color: "var(--text2)" }}>
          <span style={{ color: WARN }}>⚠ Known concentration.</span>{" "}
          {breached.map(p => `${p.a}–${p.b} = ${(p.v as number).toFixed(2)}`).join(", ")}{" "}
          sits above the {gate.toFixed(2)} gate. ORB and EMA are both long-NQ-momentum legs, so they
          rise and fall together — the book&apos;s two high-frequency legs are <em>not</em> independent.
          This is an accepted standing risk: both passed the deployment gates on their own, portfolio
          Sharpe/Calmar already bake in the realized correlation, and <strong>DC is the genuine
          diversifier</strong> (low correlation to both).
        </div>
      ) : (
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ background: "#1a2a24", border: "1px solid #1e3a30", color: "var(--text2)" }}>
          ✅ No robust pair exceeds the {gate.toFixed(2)} gate.
        </div>
      )}
    </Card>
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
                <Tile label="Daily kill switch" value="−500 pts" color={DOWN}
                  caption="Cumulative daily loss halts all new entries for the day (−$1,000 at $2/pt)." />
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
