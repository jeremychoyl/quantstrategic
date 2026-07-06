"use client"
import { SwingBlock, SwingState } from "@/lib/types"

const ROOM = "#00d4aa", RISK = "#ff4d6d"

// display order: trend up (above → below EMA200), then trend down; vol low→high
const GROUPS: { key: string; label: string }[] = [
  { key: "tup_eabv", label: "Trend up · above EMA200" },
  { key: "tup_eblw", label: "Trend up · below EMA200" },
  { key: "tdn_eabv", label: "Trend down · above EMA200" },
  { key: "tdn_eblw", label: "Trend down · below EMA200" },
]
const VOL_ORDER = ["vlow", "vmid", "vhigh"]
const VOL_LABEL: Record<string, string> = { vlow: "vol low", vmid: "vol mid", vhigh: "vol high" }

const volOf = (s: string) => s.split("_")[2]

function fmtSigned(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(0)}`
}

function Row({ st, h, max, today }: { st: SwingState; h: string; max: number; today: boolean }) {
  const d = st.horizons[h]
  if (!d) return null
  const roomPct = (d.mfe_p60 / max) * 50
  const riskPct = (d.mae_p80 / max) * 50
  return (
    <div
      className="grid items-center gap-2 rounded-md px-2"
      style={{
        gridTemplateColumns: "88px 44px 1fr 44px 42px 40px",
        height: 30,
        background: today ? "rgba(0,212,170,0.08)" : undefined,
      }}
      title={`${st.state_human} — n=${st.n} · room +${d.mfe_p60} / risk −${d.mae_p80} pts · median ${fmtSigned(d.fwd_med)} · up ${d.fwd_win_pct}%`}
    >
      <span className="text-xs truncate" style={{ color: today ? "var(--text)" : "var(--text2)", fontWeight: today ? 700 : 400 }}>
        {VOL_LABEL[volOf(st.state)]}{st.n < 60 ? " †" : ""}
        {today && (
          <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full align-middle"
                style={{ background: ROOM, color: "#04211a" }}>TODAY</span>
        )}
      </span>
      <span className="text-xs tabular-nums text-right" style={{ color: RISK }}>−{d.mae_p80.toFixed(0)}</span>
      <span className="relative block" style={{ height: 12 }}>
        {/* center zero line */}
        <span className="absolute top-0 bottom-0" style={{ left: "50%", width: 1, background: "var(--border)" }} />
        <span className="absolute top-0 bottom-0 rounded-l"
              style={{ right: `calc(50% + 1px)`, width: `${riskPct}%`, background: RISK, opacity: today ? 1 : 0.75 }} />
        <span className="absolute top-0 bottom-0 rounded-r"
              style={{ left: `calc(50% + 1px)`, width: `${roomPct}%`, background: ROOM, opacity: today ? 1 : 0.75 }} />
      </span>
      <span className="text-xs tabular-nums" style={{ color: ROOM }}>+{d.mfe_p60.toFixed(0)}</span>
      <span className="text-xs tabular-nums text-right hidden sm:block" style={{ color: "var(--muted)" }}>{fmtSigned(d.fwd_med)}</span>
      <span className="text-xs tabular-nums text-right hidden sm:block" style={{ color: "var(--muted)" }}>{d.fwd_win_pct.toFixed(0)}%</span>
    </div>
  )
}

export default function SwingMap({ swing, horizon }: { swing: SwingBlock; horizon: string }) {
  const states = swing.all_states ?? []
  // shared scale across BOTH horizons so 3d and 5d panels compare honestly
  const max = Math.max(
    700,
    ...states.flatMap(s => Object.values(s.horizons)).flatMap(d => [d.mfe_p60, d.mae_p80]),
  )
  return (
    <div>
      <div className="grid gap-2 px-2 text-[10px] font-semibold uppercase tracking-widest"
           style={{ gridTemplateColumns: "88px 44px 1fr 44px 42px 40px", color: "var(--muted)" }}>
        <span>State</span>
        <span className="text-right">Risk</span>
        <span className="text-center">← {max.toFixed(0)} pts · 0 · {max.toFixed(0)} pts →</span>
        <span>Room</span>
        <span className="text-right hidden sm:block">Med</span>
        <span className="text-right hidden sm:block">Up</span>
      </div>
      {GROUPS.map(g => {
        const members = VOL_ORDER
          .map(v => states.find(s => s.state === `${g.key}_${v}`))
          .filter((s): s is SwingState => !!s)
        if (!members.length) return null
        return (
          <div key={g.key} className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1"
               style={{ color: "var(--muted)" }}>{g.label}</p>
            <div className="space-y-0.5">
              {members.map(st => (
                <Row key={st.state} st={st} h={horizon} max={max} today={st.state === swing.state} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
