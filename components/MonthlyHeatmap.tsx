"use client"
import { MonthlyPoint } from "@/lib/types"

const UP = "0,212,170", DOWN = "255,77,109"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const fmt = (v: number) => `${v < 0 ? "−" : "+"}${Math.abs(Math.round(v)).toLocaleString()}`

// Monthly-returns heatmap — year rows × 12 months, coloured by P&L, with a year total.
export default function MonthlyHeatmap({ monthly }: { monthly: MonthlyPoint[] }) {
  if (!monthly?.length) return (
    <div className="h-24 flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>No data</div>
  )
  const byYear: Record<number, (number | null)[]> = {}
  let maxAbs = 1
  for (const m of monthly) {
    const [y, mo] = m.month.split("-")
    const yr = +y, idx = +mo - 1
    if (!byYear[yr]) byYear[yr] = Array(12).fill(null)
    byYear[yr][idx] = m.pnl
    if (Math.abs(m.pnl) > maxAbs) maxAbs = Math.abs(m.pnl)
  }
  const years = Object.keys(byYear).map(Number).sort()

  const color = (v: number | null) => {
    if (v === null) return "transparent"
    const a = 0.12 + 0.55 * Math.min(Math.abs(v) / maxAbs, 1)
    return `rgba(${v >= 0 ? UP : DOWN},${a.toFixed(2)})`
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="p-1 text-left font-semibold" style={{ color: "var(--muted)" }}></th>
            {MONTHS.map(m => (
              <th key={m} className="p-1 font-semibold" style={{ color: "var(--muted)" }}>{m}</th>
            ))}
            <th className="p-1 pl-2 font-semibold text-right" style={{ color: "var(--muted)" }}>Year</th>
          </tr>
        </thead>
        <tbody>
          {years.map(yr => {
            const row = byYear[yr]
            const total = row.reduce<number>((s, v) => s + (v ?? 0), 0)
            return (
              <tr key={yr}>
                <td className="p-1 pr-2 font-semibold tabular-nums" style={{ color: "var(--muted)" }}>{yr}</td>
                {row.map((v, i) => (
                  <td key={i} className="p-0.5">
                    <div className="w-9 h-6 rounded flex items-center justify-center tabular-nums"
                         title={v === null ? "" : `${MONTHS[i]} ${yr}: ${fmt(v)}`}
                         style={{ background: color(v), color: "var(--text)" }}>
                      {v === null ? "" : Math.round(v / 100) / 10 + "k"}
                    </div>
                  </td>
                ))}
                <td className="p-1 pl-2 text-right font-bold tabular-nums"
                    style={{ color: total >= 0 ? `rgb(${UP})` : `rgb(${DOWN})` }}>{fmt(total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
