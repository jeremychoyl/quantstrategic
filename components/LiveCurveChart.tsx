"use client"
import { LiveDayCurve } from "@/lib/types"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts"

export default function LiveCurveChart({ data }: { data: LiveDayCurve[] }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48" style={{ color: "var(--muted)" }}>
      No live trade data yet
    </div>
  )

  const last = data.at(-1)
  const pos  = (last?.cum_usd ?? 0) >= 0

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }}
               tickFormatter={d => d.slice(5)} />
        <YAxis tickFormatter={v => `$${v >= 0 ? "+" : ""}${Math.round(v)}`}
               tick={{ fill: "#6b7280", fontSize: 11 }} width={64} />
        <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 2" />
        <Tooltip
          contentStyle={{ background: "#16161f", border: "1px solid #1e1e2e", borderRadius: 8 }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(v) => [
            `$${Number(v) >= 0 ? "+" : ""}${Math.round(Number(v)).toLocaleString()}`,
            "Cum P&L",
          ]}
        />
        <Line type="monotone" dataKey="cum_usd" name="Cum P&L"
              stroke={pos ? "#00d4aa" : "#ff4d6d"}
              strokeWidth={2} dot={{ r: 3, fill: pos ? "#00d4aa" : "#ff4d6d" }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
