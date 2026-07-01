"use client"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts"
import { DrawdownPoint } from "@/lib/types"

const fmt$ = (v: number) =>
  `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString()}`

// Underwater (drawdown) curve — how far below a prior equity peak the book has
// been, month by month. Always ≤ 0; the deeper the dip, the worse the drawdown.
export function DrawdownChart({ data }: { data: DrawdownPoint[] }) {
  if (!data?.length) return (
    <div className="h-56 flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
      No data
    </div>
  )
  const ticks = data
    .filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0)
    .map(d => d.date)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ff4d6d" stopOpacity={0.05} />
            <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="date" ticks={ticks} tick={{ fill: "#6b7280", fontSize: 10 }}
               tickFormatter={d => d.slice(0, 4)} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
               tick={{ fill: "#6b7280", fontSize: 10 }} width={54} />
        <Tooltip
          contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 8 }}
          labelStyle={{ color: "#94a3b8", fontSize: 11 }}
          formatter={(v: unknown) => [fmt$(Number(v)), "Underwater"]}
        />
        <ReferenceLine y={0} stroke="#374151" />
        <Area type="monotone" dataKey="dd_usd" name="dd"
              stroke="#ff4d6d" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
