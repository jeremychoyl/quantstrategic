"use client"
import { useEffect, useState } from "react"
import { fmtDate } from "@/lib/data"

/* TradingView feed outages, measured on the Mac mini against the live bar archive.

   The headline number people reach for is "how often does the feed drop" — but the
   number that matters is what it COST, and those two answers disagree sharply here.
   So the tile row leads with the outage count and ends with realised effect, and the
   effect is stated as effect-on-us: missing a losing trade is a gain, and the sign is
   easy to get backwards. */

type Outage = {
  date: string; early_close: boolean
  bars_got: number; bars_expected: number; bars_missing: number
  windows: string[]; or_bars: number; or_expected: number; at_open: boolean
  legs_touched: string[]; impact: string; effect_usd: number
}
type Data = {
  available: boolean; reason?: string
  sessions_assessed: number; first_session: string; last_session: string
  outage_sessions: number; bars_expected: number; bars_lost: number
  bars_lost_pct: number; or_lost_sessions: number; net_effect_usd: number
  material_outages?: number; material_dates?: string[]
  total_blackouts?: number; blackout_dates?: string[]
  attribution?: { attributable_to_tradingview: number | null; why_unknown: string; not_a_cause: string }
  outages: Outage[]
}

const ACCENT = "#00d4aa", WARN = "#f59e0b", DOWN = "#ff4d6d", ACCENT2 = "#7c6af7"

function Tile({ n, label, note, color }: { n: React.ReactNode; label: string; note?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-2xl font-black tabular-nums" style={{ color: color ?? "var(--text)" }}>{n}</p>
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      {note && <p className="text-[10px] leading-snug" style={{ color: "var(--muted)" }}>{note}</p>}
    </div>
  )
}

export default function TvOutages() {
  const [d, setD] = useState<Data | null>(null)
  const [state, setState] = useState<"loading" | "ok" | "absent">("loading")
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/tv-outages?t=${Date.now()}`)
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        if (j?.published && j.data?.available) { setD(j.data); setState("ok") }
        else setState("absent")
      })
      .catch(() => { if (alive) setState("absent") })
    return () => { alive = false }
  }, [])

  if (state === "loading") {
    return <div className="rounded-xl animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)", height: 110 }} />
  }
  if (state === "absent" || !d) return null

  const rows = showAll ? d.outages : d.outages.slice(0, 5)
  const costly = d.net_effect_usd
  // How many outages actually moved money. With n=1 the headline is one lucky
  // escape, and saying "the missed trades were losers" would imply a pattern the
  // evidence does not support.
  const material = d.material_outages

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-black tracking-tight">Feed gaps</h2>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          Holes in the 5-minute bar stream, across {d.sessions_assessed} sessions
          ({fmtDate(d.first_session)} → {fmtDate(d.last_session)}). Half-days are calendar-corrected,
          so a shortened session is not counted as an outage.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <Tile n={d.total_blackouts ?? 0} label="total blackouts"
              color={(d.total_blackouts ?? 0) ? DOWN : ACCENT}
              note="sessions with no bars at all" />
        <Tile n={d.outage_sessions} label="sessions with gaps"
              color={d.outage_sessions ? WARN : ACCENT}
              note={`of ${d.sessions_assessed} assessed`} />
        <Tile n={`${d.bars_lost_pct}%`} label="bars lost"
              note={`${d.bars_lost} of ${d.bars_expected}`} />
        <Tile n={d.or_lost_sessions} label="ORB ranges lost"
              color={d.or_lost_sessions ? DOWN : ACCENT}
              note="gaps cluster at the cash open" />
        <Tile n={`${costly >= 0 ? "+" : "−"}$${Math.abs(Math.round(costly)).toLocaleString()}`}
              label="realised effect"
              color={costly >= 0 ? ACCENT : DOWN}
              note={material === 1
                ? "from a single session — not a pattern"
                : `across ${material ?? 0} sessions that moved money`} />
      </div>

      {d.attribution && (
        <p className="text-[11px] leading-relaxed rounded-lg p-3"
           style={{ background: "rgba(245,158,11,0.06)", border: "1px solid var(--border)", borderLeft: `3px solid ${WARN}`, color: "var(--text2)" }}>
          <b>These are gaps, not confirmed TradingView outages.</b> A hole in the bar stream can be
          TradingView not sending, the tunnel down, the webhook receiver restarting, or an alert
          paused — and only the first is an outage. Telling them apart needs each alert&apos;s
          last-fired time, which is visible only from the Windows machine. One thing it is
          <i> not</i>: the Windows PC being off. Alerts fire server-side.
        </p>
      )}
      <p className="text-[11px] leading-relaxed rounded-lg p-3"
         style={{ background: "rgba(0,212,170,0.05)", border: "1px solid var(--border)", borderLeft: `3px solid ${ACCENT}`, color: "var(--text2)" }}>
        <b>Frequency and cost disagree here, and cost is the one that counts.</b> The feed drops bars
        often enough to look alarming, but a lost opening range only costs money if the trailing-252d
        gate was open <i>and</i> the deployed backtest actually traded that day — usually neither. ORB is
        measured because it is fully feed-dependent; EMA and DC are flagged rather than measured, since
        their exposure is partial and claiming a number would be false precision.
        {material === 1 && d.material_dates?.[0] && (
          <>
            {" "}<b style={{ color: WARN }}>Read the {costly >= 0 ? "+" : "−"}$
            {Math.abs(Math.round(costly))} as luck, not resilience:</b> every dollar of it comes from a
            single session ({fmtDate(d.material_dates[0])}) where the trade we missed happened to be a
            loser. One session the other way and the same reliability produces a real cost.
          </>
        )}
      </p>

      <div className="rounded-xl scroll-x" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--muted)" }}>
              {["Date", "Missing (ET)", "Bars", "Opening range", "Legs at risk", "Measured impact"].map((h, i) => (
                <th key={h} className={`px-3 py-2 font-semibold whitespace-nowrap ${i === 2 || i === 3 ? "text-right" : "text-left"}`}
                    style={{ borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(o => (
              <tr key={o.date} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-3 py-2 whitespace-nowrap font-semibold">
                  {fmtDate(o.date)}
                  {o.early_close && (
                    <span className="ml-1.5 text-[10px] font-normal" style={{ color: "var(--muted)" }}>half-day</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono" style={{ color: o.at_open ? WARN : "var(--text2)" }}>
                  {o.windows.join(", ")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--muted)" }}>
                  {o.bars_got}/{o.bars_expected}
                </td>
                <td className="px-3 py-2 text-right tabular-nums"
                    style={{ color: o.at_open ? DOWN : "var(--muted)" }}>
                  {o.or_bars}/{o.or_expected}
                </td>
                <td className="px-3 py-2">
                  <span className="flex gap-1 flex-wrap">
                    {o.legs_touched.map(l => (
                      <span key={l} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: l === "ORB" ? DOWN : ACCENT2, border: `1px solid ${l === "ORB" ? DOWN : ACCENT2}` }}>
                        {l}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="px-3 py-2" style={{ color: o.effect_usd !== 0 ? "var(--text)" : "var(--muted)" }}>
                  {o.impact}
                  {o.effect_usd !== 0 && (
                    <b style={{ color: o.effect_usd > 0 ? ACCENT : DOWN }}>
                      {" "}({o.effect_usd > 0 ? "+" : "−"}${Math.abs(Math.round(o.effect_usd))} to us)
                    </b>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {d.outages.length > 5 && (
        <button onClick={() => setShowAll(s => !s)}
                className="self-start px-3 py-1.5 rounded text-xs font-semibold min-h-11 sm:min-h-0 inline-flex items-center justify-center"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
          {showAll ? "Show fewer" : `Show all ${d.outages.length}`}
        </button>
      )}
    </div>
  )
}
