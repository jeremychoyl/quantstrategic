"use client"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar, Cell,
  PieChart, Pie, ReferenceLine,
} from "recharts"
import { MonthlyPoint } from "@/lib/types"

const fmt$ = (v: number) =>
  v >= 0 ? `+$${Math.abs(v).toLocaleString()}` : `-$${Math.abs(v).toLocaleString()}`

export function PerfEquityChart({ data }: { data: MonthlyPoint[] }) {
  if (!data?.length) return (
    <div className="h-56 flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
      No data
    </div>
  )
  const ticks = data
    .filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0)
    .map(d => d.month)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eqGradPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00d4aa" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#00d4aa" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="month" ticks={ticks} tick={{ fill: "#6b7280", fontSize: 10 }}
               tickFormatter={d => d.slice(0, 4)} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
               tick={{ fill: "#6b7280", fontSize: 10 }} width={54} />
        <Tooltip
          contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 8 }}
          labelStyle={{ color: "#94a3b8", fontSize: 11 }}
          formatter={(v: unknown, name: unknown) => [fmt$(Number(v)), name === "equity" ? "Cumulative P&L" : "Monthly P&L"]}
        />
        <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 2" />
        <Area type="monotone" dataKey="equity" name="equity"
              stroke="#00d4aa" fill="url(#eqGradPos)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function YearlyBarChart({ data }: { data: MonthlyPoint[] }) {
  if (!data?.length) return null

  const yearly = Object.entries(
    data.reduce<Record<string, number>>((acc, m) => {
      const yr = m.month.slice(0, 4)
      acc[yr] = (acc[yr] ?? 0) + m.pnl
      return acc
    }, {})
  ).map(([year, pnl]) => ({ year, pnl: Math.round(pnl) }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={yearly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: "#6b7280", fontSize: 10 }} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
               tick={{ fill: "#6b7280", fontSize: 10 }} width={44} />
        <Tooltip
          contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 8 }}
          labelStyle={{ color: "#94a3b8", fontSize: 11 }}
          formatter={(v: unknown) => [fmt$(Number(v)), "Annual P&L"]}
        />
        <ReferenceLine y={0} stroke="#374151" />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={36}>
          {yearly.map((e, i) => (
            <Cell key={i} fill={e.pnl >= 0 ? "#00d4aa" : "#ff4d6d"} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function WinLossPie({
  n_winners, n_losers, n_breakeven,
}: { n_winners: number; n_losers: number; n_breakeven: number }) {
  const slices = [
    { name: "Winners",   value: n_winners,   color: "#00d4aa" },
    { name: "Losers",    value: n_losers,    color: "#ff4d6d" },
    { name: "Breakeven", value: n_breakeven, color: "#374151" },
  ].filter(s => s.value > 0)

  const total = n_winners + n_losers + n_breakeven
  if (!total) return null

  return (
    <PieChart width={112} height={112}>
      <Pie data={slices} cx={56} cy={56} innerRadius={34} outerRadius={52}
           dataKey="value" strokeWidth={0}>
        {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
      </Pie>
      <Tooltip
        contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 8 }}
        formatter={(v: unknown, name: unknown) =>
          [`${v} (${((Number(v) / total) * 100).toFixed(1)}%)`, String(name)]}
      />
    </PieChart>
  )
}
