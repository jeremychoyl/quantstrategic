"use client"
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, Legend,
} from "recharts"
import { YtdEquity } from "@/lib/types"

const fmt$ = (v: number) =>
  `${v < 0 ? "−" : "+"}$${Math.abs(Math.round(v)).toLocaleString()}`

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthTick = (d: string) => MONTHS[parseInt(d.slice(5, 7), 10)] ?? d

// keys (excluding combined) → label + colour, matching the strategy palette elsewhere
const LEGS = [
  { key: "orb",   label: "ORB (MNQ)",   color: "#4ea1ff" },
  { key: "ema",   label: "EMA (MNQ)",   color: "#00d4aa" },
  { key: "dc",    label: "DC (MNQ)",    color: "#b07cff" },
  { key: "gold",  label: "Gold (MGC)",  color: "#fbbf24" },
  { key: "crude", label: "Crude (MCL)", color: "#ff7849" },
] as const

type LegKey = (typeof LEGS)[number]["key"]

export default function BookEquityChart({ eq, focus }: { eq: YtdEquity; focus?: LegKey }) {
  const series = eq?.series ?? []
  const end = eq?.end ?? {}
  const focusLeg = focus ? LEGS.find(l => l.key === focus) : undefined
  const headline = focus ? (end[focus] ?? 0) : (end.combined ?? 0)

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-base font-black tracking-tight">
          {focusLeg ? `${focusLeg.label} — 2026 YTD` : "Book Equity — 2026 YTD"}
        </h2>
        <span className="text-sm font-bold tabular-nums"
              style={{ color: headline >= 0 ? "#00d4aa" : "#ff4d6d" }}>
          {fmt$(headline)}
        </span>
      </div>
      <p className="text-xs -mt-1" style={{ color: "var(--muted)" }}>
        {focusLeg ? "1 contract" : "5 strategies · 1 contract each"} · {eq?.since} → {eq?.through}
      </p>

      {series.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm"
             style={{ color: "var(--muted)" }}>No equity data yet</div>
      ) : (
        <div className="rounded-xl p-4"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={series} margin={{ top: 6, right: 10, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e8e8ee" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#e8e8ee" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tickFormatter={monthTick} minTickGap={28}
                     tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                     tick={{ fill: "#6b7280", fontSize: 10 }} width={48} />
              <Tooltip
                contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 8 }}
                labelStyle={{ color: "#94a3b8", fontSize: 11 }}
                formatter={(v: unknown, name: unknown) => [fmt$(Number(v)), String(name)]}
              />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 2" />
              {focusLeg ? (
                <Line type="monotone" dataKey={focusLeg.key} name={focusLeg.label}
                      stroke={focusLeg.color} strokeWidth={2.6} dot={false} />
              ) : (
                <>
                  <Area type="monotone" dataKey="combined" name="Combined book"
                        stroke="#e8e8ee" strokeWidth={2.6} fill="url(#bookGrad)" dot={false} />
                  {LEGS.map(l => (
                    <Line key={l.key} type="monotone" dataKey={l.key} name={l.label}
                          stroke={l.color} strokeWidth={1.4} dot={false} opacity={0.9} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] mt-2" style={{ color: "var(--muted)" }}>{eq?.note}</p>
        </div>
      )}
    </div>
  )
}
