"use client"
import { RiskBlock } from "@/lib/types"

const WARN = "#f59e0b"

// Honest co-active correlation cell colour: teal below the gate, amber at or
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

// Shared honest correlation matrix (co-active daily P&L, the /corr method) —
// used by both the Risk tab and the Projection tab.
export default function CorrelationMatrix({ risk }: { risk: RiskBlock }) {
  const names = Object.keys(risk.correlation_coactive)
  if (!names.length) return null
  const gate = risk.gate
  const minN = risk.min_reliable_n
  const breached = names.flatMap(a =>
    names.filter(b => a < b).map(b => ({ a, b, v: risk.correlation_coactive[a]?.[b], n: risk.coactive_n[a]?.[b] ?? 0 }))
  ).filter(p => p.v !== null && Math.abs(p.v as number) >= gate && (p.n ?? 0) >= minN)

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-bold mb-0.5">Strategy Correlation — co-active daily P&amp;L</h3>
      <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
        Pearson correlation over days both legs traded, 16-year backtest. Gate: |corr| &lt; {gate.toFixed(2)}.
        This is the honest diversification read (the same method as the live /corr monitor).
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
          sits above the {gate.toFixed(2)} gate. Since EMA went bilateral (2026-07-01), its <em>short</em> side
          overlaps ORB&apos;s short trades — both harvest the same down-trend breakdowns — so ORB and EMA co-move
          on shared days (the long sides are ~uncorrelated, +0.05). The book&apos;s two high-frequency legs are
          <em>not</em> fully independent. This is an accepted standing risk: both passed the deployment gates on
          their own, portfolio Sharpe/Calmar already bake in the realized correlation, and <strong>DC is the
          genuine diversifier</strong> (low correlation to both).
        </div>
      ) : (
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ background: "#1a2a24", border: "1px solid #1e3a30", color: "var(--text2)" }}>
          ✅ No robust pair exceeds the {gate.toFixed(2)} gate.
        </div>
      )}
    </div>
  )
}
