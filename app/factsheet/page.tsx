"use client"
import { useEffect, useState, useCallback } from "react"
import { DashboardData } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"

const UP = "#00d4aa", DOWN = "#ff4d6d", WARN = "#f59e0b", ACCENT2 = "#7c6af7"

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
      <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{title}</h2>
      {sub && <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--muted)" }}>{sub}</p>}
      {!sub && <div className="mb-3" />}
      {children}
    </div>
  )
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{k}</span>
      <span className="text-xs font-semibold text-right" style={{ color: "var(--text)" }}>{v}</span>
    </div>
  )
}

export default function Factsheet() {
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

  const p = data?.projections
  const book = p?.book
  const b16 = p?.book_16y
  const risk = p?.risk?.book
  const live = data?.live_trades?.summary
  const rd = data?.research_discipline
  const iv = data?.investor_verdict
  const asOf = data?.generated_at?.slice(0, 10)

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Fund Factsheet</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
              QuantStrategic — systematic MNQ futures · one-page investor summary
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide"
                  style={{ background: "#1a2a24", color: UP, border: "1px solid #1e3a30" }}>
              ● Live since {data?.live_since ?? "—"}
            </span>
            {asOf && <span className="text-xs" style={{ color: "var(--muted)" }}>as of {asOf}</span>}
          </div>
        </div>

        {!data && <div className="space-y-4"><Skel h={140} /><Skel h={180} /><Skel h={160} /></div>}

        {data && (
          <>
            {/* Mandate + key facts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Mandate">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                  A fully systematic, rules-based futures program trading the Micro E-mini Nasdaq-100 (MNQ).
                  Three uncorrelated-by-design strategies run together: two intraday momentum legs
                  (opening-range breakout + EMA trend cross, both flat by the close) and one daily
                  mean-reversion leg (Donchian). No discretion; every strategy cleared a fixed 6-gate
                  validation before deployment.
                </p>
              </Card>
              <Card title="Key facts">
                <KV k="Market" v="MNQ — Micro Nasdaq-100 ($2 / pt)" />
                <KV k="Style" v="Intraday momentum + daily mean-reversion" />
                <KV k="Strategies" v="ORB 30m · EMA cross 5m · DC daily" />
                <KV k="Inception (live)" v={data.live_since ?? "—"} />
                <KV k="Execution" v="Tradovate · 1-min bridge · −500 pts/day kill switch" />
                <KV k="Est. capital" v={book ? `${fmt$(book.capital_estimate_usd)} (margin + DD buffer)` : "—"} />
              </Card>
            </div>

            {/* Performance — live vs backtest */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Live — since inception" sub={`Real fills since ${data.live_since}. Small sample — accumulating toward the 100-trade validation gate.`}>
                <div className="grid grid-cols-2 gap-y-4">
                  <Stat label="Net P&L" value={live ? fmt$(live.total_pnl_usd, true) : "—"} color={(live?.total_pnl_usd ?? 0) >= 0 ? UP : DOWN} />
                  <Stat label="Completed trades" value={live ? `${live.total_trades}` : "—"} sub="algo-only" />
                  <Stat label="Win rate" value={live ? `${live.win_rate}%` : "—"} />
                  <Stat label="Avg slippage" value={live ? `${live.avg_slippage_pts.toFixed(1)} pts` : "—"} color={WARN} sub="vs signal price" />
                </div>
                <p className="text-[11px] mt-3 leading-snug" style={{ color: "var(--muted)" }}>
                  Phase-1 discipline: 1 contract each, no tinkering. First weeks were red (longs into a −4.3% Nasdaq
                  week) — ruled regime variance, within drawdown bounds; the kill switch never triggered.
                </p>
              </Card>
              <Card title="16-year backtest — deployed config" sub="1 contract each · 2010–2026 · gated by the live trailing-PF rule">
                <div className="grid grid-cols-3 gap-y-4">
                  <Stat label="Avg annual P&L" value={book ? fmt$(book.annual_usd, true) : "—"} color={UP} />
                  <Stat label="Sharpe" value={book ? book.sharpe.toFixed(2) : "—"} />
                  <Stat label="Sortino" value={b16 ? b16.sortino.toFixed(2) : "—"} />
                  <Stat label="Calmar" value={book ? book.calmar.toFixed(2) : "—"} />
                  <Stat label="Profit factor" value={b16 ? b16.profit_factor.toFixed(2) : "—"} />
                  <Stat label="Return on capital" value={book ? `${book.return_on_capital_pct.toFixed(1)}%` : "—"} color={UP} />
                </div>
                <p className="text-[11px] mt-3 leading-snug" style={{ color: "var(--muted)" }}>
                  Backtest projection, not a promise. The live PF-gate sits legs out in unfavourable regimes, so
                  realized drawdown is smaller than any single ungated leg&apos;s.
                </p>
              </Card>
            </div>

            {/* The book */}
            {p?.per_strategy && (
              <Card title="The book — 3 strategies" sub="16-year backtest · 1 MNQ each · all live">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Strategy", "Direction", "Ann. P&L", "Sharpe", "Calmar"].map((h, i) => (
                        <th key={h} className={`pb-2 text-[11px] font-semibold ${i === 0 || i === 1 ? "text-left" : "text-right"} pr-4`}
                            style={{ color: "var(--muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.per_strategy.map(s => (
                      <tr key={s.name} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="py-2 pr-4 text-sm font-bold">{s.name}</td>
                        <td className="py-2 pr-4 text-sm capitalize" style={{ color: "var(--text2)" }}>{s.direction.replace("-", " ")}</td>
                        <td className="py-2 pr-4 text-sm tabular-nums text-right" style={{ color: UP }}>{fmt$(s.annual_usd, true)}</td>
                        <td className="py-2 pr-4 text-sm tabular-nums text-right">{s.sharpe.toFixed(2)}</td>
                        <td className="py-2 text-sm tabular-nums text-right">{s.calmar.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {/* Risk + Discipline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Risk" sub="16-year backtest basis · MNQ 1 contract">
                <div className="grid grid-cols-2 gap-y-4">
                  <Stat label="Max drawdown (deployed)" value={risk ? fmt$(risk.gated_max_dd_usd) : "—"} color={DOWN} sub="ungated 16y: −$7,069" />
                  <Stat label="Daily VaR 95%" value={risk ? fmt$(risk.var95_usd) : "—"} color={DOWN} />
                  <Stat label="Annualised vol" value={risk ? fmt$(risk.ann_vol_usd) : "—"} color={WARN} />
                  <Stat label="Days underwater" value={b16 ? `${b16.days_underwater}d` : "—"} sub="longest" />
                </div>
                <p className="text-[11px] mt-3 leading-snug" style={{ color: "var(--muted)" }}>
                  Concentration note: ORB &amp; EMA are correlated long-momentum legs (+0.43); DC is the genuine
                  diversifier. Hard −500 pts/day kill switch halts new entries.
                </p>
              </Card>
              <Card title="Research discipline" sub="Why the book is what it is">
                <div className="grid grid-cols-3 gap-y-4">
                  <Stat label="Validation gates" value={rd?.gates ? `${rd.gates.length}` : "6"} sub="all must pass" />
                  <Stat label="Ideas rejected" value={rd ? `${(rd.rejected_groups ? rd.rejected_groups.reduce((n, g) => n + g.items.length, 0) : rd.tested_rejected.length)}` : "—"} sub="tested to a verdict" />
                  <Stat label="Research spend" value={rd ? `$${rd.research_spend_usd.toLocaleString()}` : "—"} sub="the cost of knowing" />
                </div>
                <p className="text-[11px] mt-3 leading-snug" style={{ color: "var(--muted)" }}>
                  Every candidate clears both-era · bilateral · walkforward · correlation · Calmar · fill-robustness.
                  A negative is a deliverable — see the Methodology tab.
                </p>
              </Card>
            </div>

            {/* Outside investor's view */}
            {iv && (
              <Card title="Outside investor's view" sub={`Adversarial allocator read · ${iv.as_of?.slice(0, 10) ?? ""}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold px-2 py-1 rounded uppercase tracking-wide"
                        style={{
                          background: iv.would_invest ? "#1a2a24" : "#3d1515",
                          color: iv.would_invest ? UP : DOWN,
                          border: `1px solid ${iv.would_invest ? "#1e3a30" : "#5a1e1e"}`,
                        }}>
                    {iv.would_invest ? "✓ Would allocate" : "✗ Would not allocate — yet"}
                  </span>
                </div>
                {iv.scorecard && (
                  <div className="mb-3">
                    {iv.scorecard.map((c, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-1.5"
                           style={{ borderBottom: "1px solid var(--border)" }}>
                        <span className="text-xs" style={{ color: "var(--text2)" }}>{c.criterion}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px]" style={{ color: "var(--muted)" }}>{c.now} / {c.target}</span>
                          <span className="text-xs font-bold" style={{ color: c.pass ? UP : DOWN }}>{c.pass ? "✓" : "✗"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "var(--muted)" }}>{iv.verdict}</p>
              </Card>
            )}

            {/* Footer / disclaimer */}
            <p className="text-[11px] leading-relaxed pt-1" style={{ color: "var(--muted)" }}>
              For informational purposes only — not investment advice, not an offer to manage money or a solicitation.
              Backtested results are hypothetical and do not represent actual trading; past performance does not
              guarantee future results. Live figures reflect a very small sample. Full detail on the Risk,
              Projection, and Methodology tabs.{asOf ? ` Data as of ${asOf}.` : ""}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
