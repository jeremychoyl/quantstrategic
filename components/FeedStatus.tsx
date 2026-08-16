"use client"
import { useEffect, useState } from "react"

/* Is the Gekko bar feed working, at a glance.

   THE AGE IS COMPUTED HERE, NOT PUBLISHED. The payload can be minutes old, so a
   published "green" would be a claim about the past dressed as the present — the
   worst failure mode for a status light. What is published is the last-bar
   TIMESTAMP; this ages it against the browser clock and ticks every 15s. A stale
   fetch therefore degrades to "last bar 47 min ago" and turns red on its own. It
   cannot show a false green.

   MARKET HOURS ARE NOT RE-IMPLEMENTED HERE. That rule lives once, in
   deadman_check.market_open. What is published alongside is the NEXT boundary, so
   this can stay correct across one transition with arithmetic instead of a second
   copy of the rule that could drift from it. */

type Check = {
  checked_at: string; state: "live" | "closed" | "stale" | "unknown"
  last_bar: string | null; age_min: number | null
  market_open: boolean; next_change_at: string | null; stale_after_min: number
}
type Data = { current: Check; history: Check[]; transitions: { at: string; from: string; to: string }[]; checks_logged: number }

const GREEN = "#00d4aa", GREY = "#6b7280", RED = "#ff4d6d", AMBER = "#f59e0b"

const ago = (iso: string | null, now: number): string => {
  if (!iso) return "never"
  const m = (now - new Date(iso).getTime()) / 60000
  if (m < 1) return "just now"
  if (m < 60) return `${Math.floor(m)} min ago`
  if (m < 48 * 60) return `${Math.floor(m / 60)}h ${Math.floor(m % 60)}m ago`
  return `${Math.floor(m / 1440)}d ago`
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  })

export default function FeedStatus() {
  const [d, setD] = useState<Data | null>(null)
  const [state, setState] = useState<"loading" | "ok" | "absent">("loading")
  const [now, setNow] = useState(() => Date.now())
  const [showLog, setShowLog] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch(`/api/feed-status?t=${Date.now()}`)
        .then(r => r.json())
        .then(j => {
          if (!alive) return
          if (j?.published && j.data?.current) { setD(j.data); setState("ok") }
          else setState("absent")
        })
        .catch(() => { if (alive) setState("absent") })
    load()
    const fetchId = setInterval(load, 60_000)   // re-fetch
    const tickId = setInterval(() => setNow(Date.now()), 15_000)  // re-age
    return () => { alive = false; clearInterval(fetchId); clearInterval(tickId) }
  }, [])

  if (state === "loading") {
    return <div className="rounded-xl animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)", height: 76 }} />
  }
  if (state === "absent" || !d) return null

  const c = d.current

  // Market state, aged forward across at most one boundary — see the note above.
  const boundary = c.next_change_at ? new Date(c.next_change_at).getTime() : null
  const open = boundary && now >= boundary ? !c.market_open : c.market_open

  // Re-derive the light from the CURRENT age, not the published verdict.
  const ageMin = c.last_bar ? (now - new Date(c.last_bar).getTime()) / 60000 : null
  const live = open && ageMin !== null && ageMin <= c.stale_after_min
  const stale = open && (ageMin === null || ageMin > c.stale_after_min)

  const label = !open ? "MARKET CLOSED" : live ? "LIVE" : "NO BARS"
  const colour = !open ? GREY : live ? GREEN : RED
  const sub = !open
    ? `Feed silent as expected. Last bar ${ago(c.last_bar, now)}${boundary ? ` · opens ${stamp(c.next_change_at!)}` : ""}`
    : live
    ? `Bars arriving. Last bar ${ago(c.last_bar, now)}`
    : `Bars should be arriving and are not — last one ${ago(c.last_bar, now)}`

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
           style={{ background: "var(--surface)", border: "1px solid var(--border)",
                    borderLeft: `4px solid ${colour}` }}>
        <span className="relative flex items-center justify-center" style={{ width: 14, height: 14 }}>
          {live && (
            <span className="absolute animate-ping rounded-full"
                  style={{ width: 14, height: 14, background: GREEN, opacity: 0.45 }} />
          )}
          <span className="rounded-full" style={{ width: 10, height: 10, background: colour }} />
        </span>
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-black tracking-tight" style={{ color: colour }}>
            GEKKO DATA FEED — {label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>{sub}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            last bar
          </p>
          <p className="text-xs font-mono tabular-nums" style={{ color: "var(--text)" }}>
            {c.last_bar ? stamp(c.last_bar) : "—"}
          </p>
        </div>
        <button onClick={() => setShowLog(s => !s)}
                className="px-2.5 py-1 rounded text-xs font-semibold"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
          {showLog ? "Hide log" : `Log (${d.checks_logged})`}
        </button>
      </div>

      {showLog && (
        <div className="rounded-xl p-4 flex flex-col gap-3"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {d.transitions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--muted)" }}>
                State changes
              </p>
              {d.transitions.slice().reverse().map((t, i) => (
                <p key={i} className="text-xs font-mono tabular-nums" style={{ color: "var(--text2)" }}>
                  {stamp(t.at)} · {t.from} → <b style={{ color: t.to === "live" ? GREEN : t.to === "stale" ? RED : AMBER }}>{t.to}</b>
                </p>
              ))}
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--muted)" }}>
              Checks · newest first · {d.checks_logged} recorded
            </p>
            <div className="max-h-64 overflow-y-auto">
              {d.history.slice().reverse().map((h, i) => (
                <div key={i} className="flex gap-3 text-xs font-mono tabular-nums py-0.5"
                     style={{ color: "var(--muted)" }}>
                  <span style={{ minWidth: 110 }}>{stamp(h.checked_at)}</span>
                  <span style={{ minWidth: 56, color: h.state === "live" ? GREEN : h.state === "stale" ? RED : "var(--muted)" }}>
                    {h.state}
                  </span>
                  <span>last bar {h.last_bar ? stamp(h.last_bar) : "—"}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Recorded once per publish cycle, about every 5 minutes. The light above is re-derived in
            your browser from the last-bar time, so it keeps ageing even if this page stops receiving
            updates — it cannot show a stale green.
          </p>
        </div>
      )}
    </div>
  )
}
