"use client"
import { useEffect, useState } from "react"
import Nav from "@/components/Nav"
import { TV_NOTES, TvNotes, TvLink, TvGroup } from "@/lib/tvNotes"
import { fmtDate } from "@/lib/data"
import PineCatalogue from "@/components/PineCatalogue"
import TvOutages from "@/components/TvOutages"

const ACCENT = "#00d4aa", ACCENT2 = "#7c6af7", WARN = "#f59e0b"

function Card({ title, sub, children }: {
  title: string; sub?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold">{title}</h2>
      {sub && <p className="text-xs mt-0.5 mb-4" style={{ color: "var(--muted)" }}>{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  )
}

/* ── reference-document cards ────────────────────────────────────────────── */

function RefCard({ link }: { link: TvLink }) {
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer"
       className="group rounded-xl p-5 flex flex-col gap-2 transition-colors"
       style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-black tracking-tight" style={{ color: "var(--text)" }}>
          {link.title}
        </h3>
        <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: ACCENT }}>open ↗</span>
      </div>
      {link.meta && (
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: ACCENT2 }}>
          {link.meta}
        </span>
      )}
      <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{link.blurb}</p>
    </a>
  )
}

/* ── takeaways ───────────────────────────────────────────────────────────── */

function Group({ group, n }: { group: TvGroup; n: number }) {
  return (
    <Card title={`${String(n).padStart(2, "0")} · ${group.title}`} sub={group.sub}>
      <div className="flex flex-col">
        {group.items.map((it, i) => (
          <div key={i} className="py-3 flex flex-col gap-1.5"
               style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
            <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
              {it.headline}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{it.detail}</p>
            {it.evidence && (
              <p className="text-[11px] leading-relaxed pl-3"
                 style={{ color: "var(--muted)", borderLeft: "2px solid var(--border)" }}>
                {it.evidence}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function TradingView() {
  // Baked-in content renders immediately; a published tradingview.json in the
  // data repo replaces it once the fetch lands. Absence is the normal state.
  const [notes, setNotes] = useState<TvNotes>(TV_NOTES)
  const [live, setLive] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/tradingview?t=${Date.now()}`)
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        if (j?.published && j.data?.groups?.length) { setNotes(j.data as TvNotes); setLive(true) }
        else setLive(false)
      })
      .catch(() => { if (alive) setLive(false) })
    return () => { alive = false }
  }, [])

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}>
      <Nav generatedAt={undefined} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

        <div>
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: ACCENT }}>
            TradingView · indicators &amp; research sync
          </p>
          <h1 className="text-2xl font-black mt-1">What the charts are for</h1>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text2)" }}>
            Reference documents for the two TradingView indicators, and the takeaways from the
            Pine-side research. <b style={{ color: "var(--text)" }}>Neither indicator places orders</b> —
            since 2026-07-01 every signal is computed on the Mac mini by <code className="font-mono text-xs">bridge.py</code>,
            which sends to Tradovate direct. TradingView&apos;s remaining live job is feeding bars.
          </p>
        </div>

        {/* feed outages — a counter up top, as asked */}
        <TvOutages />

        {/* the two reference pages */}
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.links.map(l => <RefCard key={l.href} link={l} />)}
        </div>

        {/* sync channel */}
        <Card
          title="How this page updates"
          sub="Edit one file, push it, and it appears here — no rebuild, nobody at a keyboard">
          <div className="flex flex-col gap-3">
            {/* <pre>, not <div>: the previous version put a bare "\n" inside a div, where
                whitespace collapses, so the second line ran onto the first. */}
            <pre className="rounded-lg p-3 m-0 font-mono text-[11px] leading-relaxed overflow-x-auto"
                 style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
{"edit "}<span style={{ color: ACCENT2 }}>tradingview_notes.json</span>{"\n"}
{"     │  push\n     ▼\n  "}<span style={{ color: ACCENT2 }}>PineScripts</span>{"           private — you author here\n"}
{"     │  pull + publish, every 5 min, on the Mac mini\n     ▼\n  "}<span style={{ color: ACCENT }}>quantstrategic-data</span>{"   public\n"}
{"     │  fetch  /api/tradingview\n     ▼\n  "}<span style={{ color: WARN }}>this tab</span>
            </pre>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
              The tab ships with its content compiled in, so it is never blank and never waits on a
              network call. If <code className="font-mono">tradingview.json</code> exists in the data
              repo it replaces that copy on the next load. Publishing moved off the Windows nightly job
              to the Mac mini on 2026-08-16 — one writer for that repo instead of two, and edits land in
              minutes rather than overnight. Allow up to ~5 minutes for the next publish cycle, plus up
              to ~5 more on the API cache.
            </p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: live === true ? ACCENT : live === false ? "var(--muted)" : "var(--border)" }} />
              <span style={{ color: "var(--muted)" }}>
                {live === true
                  ? "Live channel active — content published from the data repo."
                  : live === false
                  ? "Live channel idle — showing the built-in copy. Nothing published yet, which is the normal state."
                  : "Checking the live channel…"}
              </span>
            </div>
          </div>
        </Card>

        {/* every Pine script across both machines */}
        <PineCatalogue />

        {/* takeaways */}
        <div>
          <h2 className="text-lg font-black tracking-tight">Takeaways from the TradingView work</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Canonical copy in <code className="font-mono">{notes.source}</code> · reflects work through{" "}
            {fmtDate(notes.updated)}
          </p>
        </div>

        {notes.groups.map((g, i) => <Group key={g.title} group={g} n={i + 1} />)}

        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          These are reference and research notes, not live state — they describe how the indicators work
          and what the Pine-side tests returned, not what the chart says right now. For live position and
          gate state see Overview and Details.
        </p>

      </main>
    </div>
  )
}
