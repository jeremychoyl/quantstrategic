"use client"
import { Seasonality, SeasonalityMonth } from "@/lib/types"

const UP = "#00d4aa", DOWN = "#ff4d6d", FIRM = "#5bbf9a", MUTED = "#8a90a6"

const barColor = (m: SeasonalityMonth) =>
  m.label === "bullish" ? UP : m.label === "firm" ? FIRM : m.label === "bearish" ? DOWN : MUTED

const fmtPct = (v: number, sign = true) => `${sign && v >= 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}%`

// MNQ month-of-year price seasonality — diverging bars of avg monthly return, 16y NQ RTH.
// DESCRIPTIVE context only, never a signal (calendar seasonality is gate-rejected).
export default function SeasonalityChart({ seasonality }: { seasonality?: Seasonality }) {
  if (!seasonality?.months?.length) return null
  const { months, most_bullish, most_bearish, most_volatile, span } = seasonality
  const curMonth = new Date().getMonth() + 1   // 1-12, highlight the live month
  const maxAbs = Math.max(1, ...months.map(m => Math.abs(m.avg_month_ret)))

  const Chip = ({ label, val, color }: { label: string; val: string; color: string }) => (
    <div className="rounded-lg px-3 py-2" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color }}>{val}</div>
    </div>
  )

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold">MNQ month-of-year profile</h2>
      <p className="text-xs mt-0.5 mb-4" style={{ color: "var(--muted)" }}>
        Average return by calendar month · {span?.start?.slice(0, 4)}–{span?.end?.slice(0, 4)} NQ RTH · descriptive, not a signal
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Chip label="Most bullish" val={most_bullish.join(" · ")} color={UP} />
        <Chip label="Weakest" val={most_bearish[0]} color={DOWN} />
        <Chip label="Most volatile" val={most_volatile} color={MUTED} />
      </div>

      <div className="space-y-1.5">
        {months.map(m => {
          const w = (Math.abs(m.avg_month_ret) / maxAbs) * 50    // half-width each side of centre
          const pos = m.avg_month_ret >= 0
          const c = barColor(m)
          const live = m.m === curMonth
          return (
            <div key={m.m} className="flex items-center gap-2">
              <span className="text-[11px] w-9 tabular-nums font-semibold flex items-center gap-1"
                    style={{ color: live ? "var(--text)" : "var(--muted)" }}>
                {m.name}{live && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent, #7c6af7)" }} />}
              </span>
              <div className="flex-1 flex items-center">
                <div className="w-1/2 flex justify-end">
                  {!pos && <div className="h-3.5 rounded-l" style={{ width: `${w}%`, background: c }} />}
                </div>
                <div className="w-px h-4" style={{ background: "var(--border)" }} />
                <div className="w-1/2">
                  {pos && <div className="h-3.5 rounded-r" style={{ width: `${w}%`, background: c }} />}
                </div>
              </div>
              <span className="text-[11px] w-14 text-right tabular-nums" style={{ color: pos ? c : DOWN }}>
                {fmtPct(m.avg_month_ret)}
              </span>
              <span className="text-[10px] w-20 text-right tabular-nums hidden sm:inline" style={{ color: "var(--muted)" }}>
                {m.win_pct}% up · {m.both_era ? "both eras" : "1-era"}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px]" style={{ color: "var(--muted)" }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: UP }} />bullish (both-era, t≥1)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: FIRM }} />firm</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: MUTED }} />neutral</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: DOWN }} />bearish</span>
      </div>
      <p className="text-[11px] mt-2 leading-snug" style={{ color: "var(--muted)" }}>
        {seasonality.note} “Sell in May” fails for NQ (May/Jul/Nov strongest); September the one weak month (post-2021).
      </p>
    </div>
  )
}
