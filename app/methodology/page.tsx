"use client"
import { useEffect, useState, useCallback } from "react"
import { DashboardData, ResearchDiscipline, RejectedIdea } from "@/lib/types"
import { fetchDashboard } from "@/lib/data"
import Nav from "@/components/Nav"

const UP = "#00d4aa", WARN = "#f59e0b", ACCENT2 = "#7c6af7"

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

function PatternPill({ pattern }: { pattern?: string }) {
  if (!pattern) return null
  return (
    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ background: "#2a1a10", color: WARN, border: "1px solid #854d0e" }}>
      {pattern}
    </span>
  )
}

function RejectedRow({ r }: { r: RejectedIdea }) {
  return (
    <div className="py-3 flex flex-col gap-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{r.idea}</span>
        <PatternPill pattern={r.pattern} />
      </div>
      <span className="text-xs leading-snug" style={{ color: "var(--muted)" }}>{r.reason}</span>
    </div>
  )
}

export default function Methodology() {
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

  const rd: ResearchDiscipline | undefined = data?.research_discipline
  const groups = rd?.rejected_groups
  const totalRejected = groups
    ? groups.reduce((n, g) => n + g.items.length, 0)
    : rd?.tested_rejected?.length ?? 0

  return (
    <div className="min-h-screen flex flex-col">
      <Nav generatedAt={data?.generated_at} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-black tracking-tight">Methodology &amp; Rejected Ideas</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            How every strategy is tested before it can go live — and everything that didn&apos;t make it
          </p>
        </div>

        {!data && (
          <div className="space-y-4">
            <Skel h={90} /><Skel h={200} /><Skel h={160} /><Skel h={320} />
          </div>
        )}

        {data && !rd && (
          <div className="rounded-xl p-6 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
            Methodology data not yet published.
          </div>
        )}

        {rd && (
          <>
            {/* Headline + summary + stat chips */}
            <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-base font-bold" style={{ color: UP }}>{rd.headline}</p>
              {rd.summary && (
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text2)" }}>{rd.summary}</p>
              )}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div>
                  <p className="text-2xl font-black tabular-nums" style={{ color: "var(--text)" }}>{totalRejected}</p>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>ideas tested &amp; rejected</p>
                </div>
                <div>
                  <p className="text-2xl font-black tabular-nums" style={{ color: WARN }}>${rd.research_spend_usd.toLocaleString()}</p>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>research spend</p>
                </div>
                <div>
                  <p className="text-2xl font-black tabular-nums" style={{ color: UP }}>{rd.book.length}</p>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>live strategies ({rd.book.join(" · ")})</p>
                </div>
              </div>
            </div>

            {/* The gate suite */}
            {rd.gates && (
              <Card title="The gate suite — every candidate must clear all six"
                    sub="A strategy is not deployed unless it passes each of these, in order. No discretionary overrides.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rd.gates.map((g, i) => (
                    <div key={g.name} className="rounded-lg p-3 flex gap-3"
                         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <span className="text-sm font-black tabular-nums" style={{ color: ACCENT2 }}>{i + 1}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{g.name}</p>
                        <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--muted)" }}>{g.rule}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recurring failure patterns */}
            {rd.failure_patterns && (
              <Card title="Why ideas die — the recurring patterns"
                    sub="Almost every rejection falls into one of these. Naming them keeps us from re-testing the same trap.">
                <div className="space-y-2">
                  {rd.failure_patterns.map(p => (
                    <div key={p.name} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-1.5"
                         style={{ borderBottom: "1px solid var(--border)" }}>
                      <span className="text-sm font-bold min-w-[180px]" style={{ color: WARN }}>{p.name}</span>
                      <span className="text-xs leading-snug" style={{ color: "var(--muted)" }}>{p.desc}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Rejected ideas — grouped */}
            {groups ? (
              <div className="space-y-4">
                <h2 className="text-sm font-bold">Rejected ideas — the full ledger</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {groups.map(g => (
                    <div key={g.category} className="rounded-xl p-5"
                         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-baseline justify-between mb-1">
                        <h3 className="text-sm font-bold">{g.category}</h3>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{g.items.length}</span>
                      </div>
                      {g.items.map((r, i) => <RejectedRow key={i} r={r} />)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Card title="Rejected ideas">
                {rd.tested_rejected.map((r, i) => <RejectedRow key={i} r={r} />)}
              </Card>
            )}

            {/* Spend ledger */}
            {rd.spend_ledger && (
              <Card title="Research spend ledger — the cost of knowing"
                    sub="Databento data purchases. A rejection is a deliverable: knowing an edge isn't there is worth paying for.">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>${rd.spend_ledger.bars_usd.toLocaleString()}</p>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>OHLCV bars</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>${rd.spend_ledger.ticks_usd.toLocaleString()}</p>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>tick / order-flow</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold tabular-nums" style={{ color: WARN }}>${rd.spend_ledger.total_usd.toLocaleString()}</p>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>total</p>
                  </div>
                </div>
                <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>{rd.spend_ledger.note}</p>
              </Card>
            )}

            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Full detail lives in the research repo (CLAUDE.md · REJECTED_IDEAS.md).
              {rd.as_of ? ` As of ${rd.as_of}.` : ""}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
