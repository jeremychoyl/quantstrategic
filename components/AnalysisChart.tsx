"use client"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts"

// Minimal shape — the chart only reads date + combined_pct, so any curve
// (live MNQ EquityPoint or the 5-strategy BookEquityPoint) is accepted.
type CurvePoint = { date: string; combined_pct?: number }

export default function AnalysisChart({ data }: { data: CurvePoint[] }) {
  if (!data.length) return (
    <p className="text-sm mt-4" style={{ color: "var(--muted)" }}>No data for selected period</p>
  )
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }}
               tickFormatter={d => d.slice(5)}
               ticks={data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0).map(d => d.date)} />
        <YAxis tickFormatter={v => `${v >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`}
               tick={{ fill: "#6b7280", fontSize: 11 }} width={56} />
        <ReferenceLine y={0} stroke="#2d2d44" />
        <Tooltip
          contentStyle={{ background: "#16161f", border: "1px solid #1e1e2e", borderRadius: 8 }}
          formatter={(v) => [`${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`, "Portfolio"]}
        />
        <Line type="monotone" dataKey="combined_pct" stroke="#00d4aa" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
