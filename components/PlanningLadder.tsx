"use client"
import { PlanningLadder as PL } from "@/lib/types"

const UP   = "#00d4aa"
const DOWN = "#ff4d6d"

const fmt$ = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString()}`
const fmtK = (v: number) => `$${Math.round(v / 1000)}k`

function Cell({ children, color, bold, right = true }: {
  children: React.ReactNode; color?: string; bold?: boolean; right?: boolean
}) {
  return (
    <td className={`px-3 py-2.5 tabular-nums ${right ? "text-right" : "text-left"} ${bold ? "font-bold" : ""}`}
        style={{ color: color ?? "var(--text)" }}>
      {children}
    </td>
  )
}

export default function PlanningLadder({ ladder }: { ladder: PL }) {
  const { rungs, unit, target } = ladder
  const cap = target.capital_estimate

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-black tracking-tight">Planning Ladder — Capital → Income</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          Planning expectancy = ⅔ × model (selection-bias haircut). Money numbers recompute nightly from the
          gated book; capital rungs mirror <span className="font-semibold">{ladder.source}</span>.
        </p>
        <p className="text-xs mt-0.5 font-semibold" style={{ color: "var(--muted)" }}>
          Rungs step ONLY at quarterly reviews when every promotion condition holds — a red or green month is never a reason to move.
        </p>
      </div>

      {/* The $5k question, answered */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {[
            { label: `Target income`, value: `${fmt$(target.monthly)}/mo`, sub: `${fmt$(target.annual)}/yr`, color: "var(--text)" },
            { label: `Per 1-1-1 unit`, value: `${fmt$(unit.plan_mo)}/mo`, sub: `${fmt$(unit.plan_ann)}/yr · haircut`, color: UP },
            { label: `Units to target`, value: `≈ ${target.units}`, sub: `1-1-1 book units`, color: "var(--accent)" },
            { label: `Capital required`, value: cap != null ? `≈ ${fmtK(cap)}` : "—", sub: `50%-envelope rule`, color: DOWN, last: true },
          ].map((s, i) => (
            <div key={i} className="p-4 flex flex-col gap-1"
                 style={{ borderRight: s.last ? "none" : "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{s.label}</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rung table */}
      <div className="rounded-xl overflow-x-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Step</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Size O-E-D</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Min equity</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Model $/yr</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Plan $/yr</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Plan $/mo</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Model maxDD</th>
            </tr>
          </thead>
          <tbody>
            {rungs.map((r) => {
              const current = r.step === 0
              return (
                <tr key={r.step} style={{
                  borderBottom: "1px solid var(--border)",
                  background: current ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                }}>
                  <Cell right={false} bold>
                    <span className="inline-flex items-center gap-2">
                      {r.label}
                      {current && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                              style={{ background: "#1a2a24", color: UP, border: "1px solid #1e3a30" }}>
                          ● Current
                        </span>
                      )}
                    </span>
                  </Cell>
                  <Cell right={false}>
                    <span className="tabular-nums">{r.size_str}</span>
                    {r.note && <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>{r.note}</span>}
                  </Cell>
                  <Cell>{fmtK(r.min_equity)}</Cell>
                  <Cell color="var(--muted)">{fmt$(r.model_ann)}</Cell>
                  <Cell color={UP}>{fmt$(r.plan_ann)}</Cell>
                  <Cell color={UP} bold>{fmt$(r.plan_mo)}</Cell>
                  <Cell color={DOWN}>{fmt$(r.model_maxdd)}</Cell>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Basis: {ladder.basis}. {ladder.note}
      </p>
    </div>
  )
}
