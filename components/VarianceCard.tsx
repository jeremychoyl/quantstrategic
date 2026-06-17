"use client"
import { StrategyBacktestStats } from "@/lib/types"

const UP   = "#00d4aa"
const DOWN = "#ff4d6d"
const WARN = "#f59e0b"

type DriftStatus = "on_track" | "below" | "underperforming"

const STYLE: Record<DriftStatus, { bg: string; border: string; color: string; label: string; icon: string }> = {
  on_track:        { bg: "#0a1a12", border: "#1a3020", color: UP,   label: "On track",          icon: "✅" },
  below:           { bg: "#1a1500", border: "#3a2a0a", color: WARN, label: "Below expectation", icon: "⚠️" },
  underperforming: { bg: "#1a0a0a", border: "#3a1010", color: DOWN, label: "Underperforming",   icon: "🔴" },
}

function status(current: number, mean: number, std: number): DriftStatus {
  if (current >= mean - std)     return "on_track"
  if (current >= mean - 2 * std) return "below"
  return "underperforming"
}

function fmt$(v: number, sign = false) {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}

function monthsElapsed(since = "2026-01-01"): number {
  const s = new Date(since)
  const n = new Date()
  return Math.max(
    (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth()) + n.getDate() / 30,
    0.1
  )
}

export default function VarianceCard({
  stats,
  ytdTotalUsd,
  label = "Strategy Variance",
  ytdSince = "2026-01-01",
}: {
  stats: StrategyBacktestStats
  ytdTotalUsd: number
  label?: string
  ytdSince?: string
}) {
  const n      = monthsElapsed(ytdSince)
  const mean   = stats.monthly_mean_usd
  const std    = stats.monthly_std_usd
  const curr   = ytdTotalUsd > 0 ? ytdTotalUsd / n : null
  const st     = STYLE[curr !== null ? status(curr, mean, std) : "on_track"]

  return (
    <div className="rounded-xl px-5 py-4"
         style={{ background: st.bg, border: `1px solid ${st.border}` }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: st.color }}>
            {st.icon} {label} · {st.label}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: st.color, opacity: 0.8 }}>
            Historical baseline (16y): {fmt$(mean, true)} ± {fmt$(std)} / month
            {" · "}1σ range [{fmt$(mean - std)}, {fmt$(mean + std, true)}]
          </p>
        </div>
        <div className="text-right shrink-0">
          {curr !== null ? (
            <>
              <p className="text-lg font-bold tabular-nums" style={{ color: st.color }}>
                {fmt$(curr, true)} / month
              </p>
              <p className="text-xs" style={{ color: st.color, opacity: 0.7 }}>
                2026 YTD · {n.toFixed(1)} months
              </p>
            </>
          ) : (
            <p className="text-xs" style={{ color: st.color, opacity: 0.7 }}>No 2026 trades yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
