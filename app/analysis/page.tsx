"use client"
import { useEffect, useState, useCallback } from "react"
import { DashboardData, Strategy16y } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import CorrelationMatrix from "@/components/CorrelationMatrix"

const UP = "#00d4aa", DOWN = "#ff4d6d", ACCENT2 = "#7c6af7"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const KEY: Record<string, string> = { ORB: "orb", EMA: "ema", DC: "dc" }

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

export default function Analysis() {
  const [data, setData] = useState<DashboardData | null>(null)
  const load = useCallback(async () => { const d = await fetchDashboard(); if (d) setData(d) }, [])
  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id) }, [load])

  const p = data?.projections
  const perStrat = p?.per_strategy?.filter(s => s.instrument === "MNQ") ?? []
  const bookTotal = perStrat.reduce((s, x) => s + x.total_usd, 0) || 1
  const s16 = p?.strategy_16y

  // month-of-year seasonality from the 16y book monthly series
  const b: Strategy16y | undefined = p?.book_16y
  const moSum = Array(12).fill(0), moN = Array(12).fill(0)
  b?.monthly?.forEach(m => { const i = +m.month.split("-")[1] - 1; moSum[i] += m.pnl; moN[i]++ })
  const seasonal = MONTHS.map((name, i) => ({ name, avg: moN[i] ? moSum[i] / moN[i] : 0 }))
  const seasonMax = Math.max(1, ...seasonal.map(s => Math.abs(s.avg)))

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-black tracking-tight">Analysis</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Attribution &amp; decomposition — where the book&apos;s return comes from · 16-year backtest
          </p>
        </div>

        {!data && <div className="space-y-4"><Skel h={180} /><Skel h={200} /><Skel h={200} /></div>}

        {p && (
          <>
            {/* Contribution */}
            <Card title="P&L attribution by strategy" sub="Each strategy's share of the 16-year book net · 1 contract each">
              <div className="space-y-3">
                {perStrat.map(s => {
                  const pct = (s.total_usd / bookTotal) * 100
                  return (
                    <div key={s.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold">{s.name} <span className="font-normal capitalize" style={{ color: "var(--muted)" }}>· {s.direction.replace("-", " ")}</span></span>
                        <span className="tabular-nums" style={{ color: "var(--muted)" }}>{fmt$(s.total_usd, true)} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2.5 rounded" style={{ background: "var(--surface2)" }}>
                        <div className="h-2.5 rounded" style={{ width: `${Math.max(2, pct)}%`, background: ACCENT2 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Per-strategy stats */}
            {s16 && (
              <Card title="Per-strategy detail" sub="16-year backtest · trade basis">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Strategy", "Net $", "Trades", "Win %", "Profit factor", "Sharpe", "Calmar", "Max DD"].map((h, i) => (
                          <th key={h} className={`pb-2 text-[11px] font-semibold ${i === 0 ? "text-left" : "text-right"} pr-4`} style={{ color: "var(--muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {perStrat.map(s => {
                        const d = s16[KEY[s.name]]
                        if (!d) return null
                        return (
                          <tr key={s.name} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td className="py-2 pr-4 text-sm font-bold">{s.name}</td>
                            <td className="py-2 pr-4 text-sm tabular-nums text-right" style={{ color: UP }}>{fmt$(d.total_usd, true)}</td>
                            <td className="py-2 pr-4 text-sm tabular-nums text-right" style={{ color: "var(--text2)" }}>{d.n_trades.toLocaleString()}</td>
                            <td className="py-2 pr-4 text-sm tabular-nums text-right">{d.win_rate}%</td>
                            <td className="py-2 pr-4 text-sm tabular-nums text-right" style={{ color: d.profit_factor >= 1.5 ? UP : "var(--text)" }}>{d.profit_factor.toFixed(2)}</td>
                            <td className="py-2 pr-4 text-sm tabular-nums text-right">{d.sharpe.toFixed(2)}</td>
                            <td className="py-2 pr-4 text-sm tabular-nums text-right">{d.calmar.toFixed(2)}</td>
                            <td className="py-2 text-sm tabular-nums text-right" style={{ color: DOWN }}>{fmt$(-Math.abs(d.max_dd_usd))}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] mt-3 leading-snug" style={{ color: "var(--muted)" }}>
                  DC&apos;s trade count reflects the deployment-gated subset — its trailing-PF gate needs ~15y of
                  DC&apos;s ~17-trades/yr to warm up, so only recent trades are gate-active (same basis as Projection).
                  DC&apos;s full-history risk (277 days) is on the Risk tab.
                </p>
              </Card>
            )}

            {/* Correlation (shared honest co-active matrix) */}
            {p.risk && <CorrelationMatrix risk={p.risk} />}

            {/* Seasonality */}
            {b?.monthly?.length ? (
              <Card title="Seasonality — average by month" sub="Mean book P&L per calendar month across 2010–2026 · descriptive, not a signal">
                <div className="space-y-1.5">
                  {seasonal.map(s => {
                    const w = (Math.abs(s.avg) / seasonMax) * 50   // half-width each side of center
                    const pos = s.avg >= 0
                    return (
                      <div key={s.name} className="flex items-center gap-2">
                        <span className="text-[11px] w-8 tabular-nums" style={{ color: "var(--muted)" }}>{s.name}</span>
                        <div className="flex-1 flex items-center">
                          <div className="w-1/2 flex justify-end">
                            {!pos && <div className="h-3 rounded-l" style={{ width: `${w}%`, background: DOWN }} />}
                          </div>
                          <div className="w-px h-4" style={{ background: "var(--border)" }} />
                          <div className="w-1/2">
                            {pos && <div className="h-3 rounded-r" style={{ width: `${w}%`, background: UP }} />}
                          </div>
                        </div>
                        <span className="text-[11px] w-16 text-right tabular-nums" style={{ color: pos ? UP : DOWN }}>{fmt$(s.avg, true)}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] mt-3" style={{ color: "var(--muted)" }}>
                  July is the strongest month, September the weakest (both eras) — but calendar seasonality failed the deployment
                  gates as a standalone leg (redundant with EMA / lumpy drawdown). See the Method tab.
                </p>
              </Card>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
