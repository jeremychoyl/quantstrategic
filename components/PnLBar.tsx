"use client"
import { DayPnL } from "@/lib/types"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell, ReferenceLine,
} from "recharts"

export default function PnLBar({ data }: { data: DayPnL[] }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48"
         style={{ color: "var(--muted)" }}>No demo P&L yet — first trades pending</div>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }}
               tickFormatter={d => d.slice(5)} />
        <YAxis tickFormatter={v => `${v > 0 ? "+" : ""}${v.toFixed(0)}`}
               tick={{ fill: "#6b7280", fontSize: 11 }} width={40} />
        <ReferenceLine y={0} stroke="#2d2d44" />
        <Tooltip
          contentStyle={{ background: "#16161f", border: "1px solid #1e1e2e", borderRadius: 8 }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(v) => { const n = Number(v); return [`${n >= 0 ? "+" : ""}${n.toFixed(1)} pts  ($${(n * 2).toFixed(0)})`, "P&L"] }}
        />
        <Bar dataKey="pnl_pts" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.pnl_pts >= 0 ? "#00d4aa" : "#ff4d6d"} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
