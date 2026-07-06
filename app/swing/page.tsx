"use client"
import { useEffect, useState, useCallback } from "react"
import { DashboardData } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"
import SwingMap from "@/components/SwingMap"

const ROOM = "#00d4aa", RISK = "#ff4d6d"

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

export default function Swing() {
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

  const swing = data?.swing
  const d3 = swing?.horizons?.["3d"]
  const d5 = swing?.horizons?.["5d"]

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-black tracking-tight">Swing awareness</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            How far NQ historically travels above (room) and below (risk) the close over the next 3–5
            sessions, by daily state · 16y history · awareness only, never a signal
          </p>
        </div>

        {!data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Skel h={104} /><Skel h={104} /><Skel h={104} /><Skel h={104} />
            </div>
            <Skel h={420} />
          </div>
        )}

        {data && !swing?.all_states?.length && (
          <Card title="Swing awareness not available yet">
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              swing_awareness.json has not been generated — it refreshes with the nightly research run.
            </p>
          </Card>
        )}

        {swing && !!swing.all_states?.length && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile label="Today's state" value={swing.state_human.replace("trend20", "trend")}
                    caption={`${swing.n} similar days in 16y · as of ${swing.as_of} close ${swing.close.toLocaleString()}`} />
              {d3 && <Tile label="3-day geometry" value={`+${d3.mfe_p60.toFixed(0)} / −${d3.mae_p80.toFixed(0)}`}
                    caption={`room is ${(d3.mfe_p60 / d3.mae_p80).toFixed(2)}× the risk (60pct MFE / 80pct MAE, pts)`}
                    color={d3.mfe_p60 >= d3.mae_p80 ? ROOM : RISK} />}
              {d5 && <Tile label="5-day geometry" value={`+${d5.mfe_p60.toFixed(0)} / −${d5.mae_p80.toFixed(0)}`}
                    caption={`room is ${(d5.mfe_p60 / d5.mae_p80).toFixed(2)}× the risk`}
                    color={d5.mfe_p60 >= d5.mae_p80 ? ROOM : RISK} />}
              {d3 && <Tile label="3-day odds" value={`${d3.fwd_win_pct.toFixed(1)}% up`}
                    caption={`median move ${d3.fwd_med >= 0 ? "+" : "−"}${Math.abs(d3.fwd_med).toFixed(0)} pts`} />}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={{ background: ROOM }} />
                Room — 60th-pct upside excursion
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={{ background: RISK }} />
                Risk — 80th-pct downside excursion
              </span>
              <span>Long-side convention — a swing short reads room and risk swapped · † n &lt; 60, indicative only</span>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <Card title="3-day horizon" sub="excursions over the next 3 sessions from the state-day close">
                <SwingMap swing={swing} horizon="3d" />
              </Card>
              <Card title="5-day horizon" sub="next 5 sessions · same scale as the 3-day panel">
                <SwingMap swing={swing} horizon="5d" />
              </Card>
            </div>

            <Card title="How to read this" sub="and why it exists">
              <div className="text-xs space-y-2 leading-relaxed" style={{ color: "var(--text2)" }}>
                <p>
                  Each day closes in one of 12 states: trend20 direction × close vs daily EMA200 ×
                  volatility tercile (ATR14% rank, trailing year). For every past day in the same state,
                  the map measures how far price reached above and below that day's close over the
                  following 3 and 5 sessions. Room is the 60th percentile of the upside excursion; risk
                  is the 80th percentile of the downside — deliberately asymmetric percentiles, the same
                  convention as the hourly Markov levels line.
                </p>
                <p>
                  Risk exceeds room in every state — NQ grinds up and crashes down — so the question is
                  never whether the geometry is good, only where it is least bad. Med and Up columns give
                  the median close-to-close move and the share of occurrences that closed higher.
                </p>
                <p style={{ color: "var(--muted)" }}>
                  Awareness for discretionary swing takes only. Multi-day NQ strategies have repeatedly
                  failed the Calmar gate in research; nothing here feeds the automated book. Refreshed
                  nightly from the 16y research dataset. One state (trend up · below EMA200 · vol low)
                  has too few occurrences to show.
                </p>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
