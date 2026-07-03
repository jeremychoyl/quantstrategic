"use client"
import { BenchmarkPoint } from "@/lib/types"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from "recharts"

const fmt = (v: number) => `$${v >= 0 ? "+" : ""}${Math.round(v).toLocaleString()}`

export default function BenchmarkChart({ data }: { data: BenchmarkPoint[] }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48"
         style={{ color: "var(--muted)" }}>No benchmark data yet</div>
  )
  const ticks = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0)
                    .map(d => d.date)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="date" ticks={ticks} tick={{ fill: "#6b7280", fontSize: 11 }}
               tickFormatter={d => d.slice(5)} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
               tick={{ fill: "#6b7280", fontSize: 11 }} width={48} />
        <Tooltip
          contentStyle={{ background: "#16161f", border: "1px solid #1e1e2e", borderRadius: 8 }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(v, name) => [fmt(Number(v)), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Line type="monotone" dataKey="book" name="Book (ORB+EMA+DC)" stroke="#00d4aa"
              strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="bh_nq" name="Buy & hold 1 MNQ" stroke="#f59e0b"
              strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="tbill" name="T-bill on capital" stroke="#6b7280"
              strokeWidth={1.5} dot={false} strokeDasharray="2 3" />
      </LineChart>
    </ResponsiveContainer>
  )
}
