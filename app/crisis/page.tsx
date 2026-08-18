"use client"
import { useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer, ComposedChart, AreaChart, Area, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea,
} from "recharts"
import Nav from "@/components/Nav"

// ---- types (mirrors tmp/crisis_impact.py --export) ----
type Pt = { d: string; eq: number; dd: number; ORB: number; EMA: number; DC: number }
type Crisis = { name: string; a: string; b: string; net: number; dd: number; bench: string }
type Variant = {
  series: Pt[]; crises: Crisis[]; legtot: Record<string, number>
  total: number; maxdd: number; maxdd_date: string
}
type Data = { gated: Variant; ungated: Variant; start: string; end: string; note: string }

const C = { book: "#00d4aa", ORB: "#f59e0b", EMA: "#7c6af7", DC: "#38bdf8", dd: "#ff4d6d" }
const WARN = "#f5a623"
const LEGS = ["ORB", "EMA", "DC"] as const
type Leg = typeof LEGS[number]

const fmt$ = (v: number, sign = false) => {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}
const acct = (v: number) => // accounting: (x) for negatives, + kept on positives
  v < 0 ? `($${Math.abs(Math.round(v)).toLocaleString()})` : `+$${Math.round(v).toLocaleString()}`
const ms = (d: string) => new Date(d).getTime()
const yr = (d: string) => new Date(d).getFullYear()

function Tile({ label, value, caption, color }: {
  label: string; value: React.ReactNode; caption: string; color?: string
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1.5"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-black tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
      <p className="text-[11px] leading-snug" style={{ color: "var(--muted)" }}>{caption}</p>
    </div>
  )
}

function Card({ title, sub, right, children }: {
  title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Skel({ h }: { h: number }) {
  return <div className="animate-pulse rounded" style={{ height: h, background: "var(--surface2)" }} />
}

export default function CrisisPage() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [variant, setVariant] = useState<"gated" | "ungated">("gated")
  const [legOn, setLegOn] = useState<Record<Leg, boolean>>({ ORB: true, EMA: true, DC: true })
  const [sortK, setSortK] = useState<"start" | "net" | "dd" | "name" | "bench">("start")
  const [sortDir, setSortDir] = useState(1)

  useEffect(() => {
    fetch(`/api/crisis?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData).catch(e => setErr(String(e)))
  }, [])

  const V = data?.[variant]
  const other = data?.[variant === "gated" ? "ungated" : "gated"]

  const chartData = useMemo(
    () => V?.series.map(p => ({ ...p, t: ms(p.d) })) ?? [],
    [V]
  )
  const yearTicks = useMemo(() => {
    if (!chartData.length) return []
    const out: number[] = []
    for (let y = yr(data!.start) + 1; y <= yr(data!.end); y += 2) out.push(new Date(`${y}-01-01`).getTime())
    return out
  }, [chartData, data])

  const rows = useMemo(() => {
    if (!V) return []
    const r = [...V.crises]
    r.sort((a, b) => {
      if (sortK === "name" || sortK === "bench") {
        const x = String(a[sortK]).toLowerCase(), y = String(b[sortK]).toLowerCase()
        return x < y ? -sortDir : x > y ? sortDir : 0
      }
      const x = sortK === "start" ? ms(a.a) : a[sortK], y = sortK === "start" ? ms(b.a) : b[sortK]
      return (x - y) * sortDir
    })
    return r
  }, [V, sortK, sortDir])

  const covid = V?.crises.find(c => /COVID/i.test(c.name))
  const covidOther = other?.crises.find(c => /COVID/i.test(c.name))
  const deepest = useMemo(
    () => V ? [...V.crises].sort((a, b) => a.dd - b.dd)[0] : null, [V]
  )

  const setSort = (k: typeof sortK) => {
    if (k === sortK) setSortDir(d => -d)
    else { setSortK(k); setSortDir(k === "net" ? -1 : 1) }
  }
  const arrow = (k: typeof sortK) => k !== sortK ? "" : (sortDir === 1 ? " ↑" : " ↓")

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}>
      <Nav generatedAt={undefined} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

        <div>
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--accent)" }}>
            Crisis stress · 2010–2026 · 1 MNQ / leg
          </p>
          <h1 className="text-2xl font-black mt-1">How financial crises hit the book</h1>
        </div>

        {/* key finding */}
        <div className="rounded-xl p-4"
             style={{ background: "rgba(0,212,170,0.06)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)" }}>
          <p className="text-[11px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--accent)" }}>Key finding</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            <b>No financial crisis produced the book&apos;s worst drawdown.</b>{" "}The three legs disagree in a
            panic — EMA&apos;s short side and DC&apos;s bounce cover ORB&apos;s whipsaw — so every crisis nets
            positive or only mildly negative. The −$5,417 max drawdown came from a quiet, directionless 2026 chop
            stretch, <i>not</i> a crash. COVID cost just −$478 live because the 252-day gate benched ORB entirely
            (vs −$3,129 with it traded).
          </p>
        </div>

        {err && <div className="text-sm" style={{ color: C.dd }}>Couldn&apos;t load crisis data ({err}).</div>}
        {!data && !err && <Skel h={520} />}

        {V && (
          <>
            {/* stat tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile label="Total net · 1-1-1" value={fmt$(V.total, true)} color={C.book}
                    caption={`${variant === "gated" ? "gated, live-tradeable" : "ungated, raw backtest"} · ~14.9 yrs`} />
              <Tile label="Max drawdown" value={fmt$(V.maxdd)} color={C.dd}
                    caption={`trough ${V.maxdd_date}${variant === "gated" ? " — not a crisis" : ""}`} />
              <Tile label="Deepest crisis DD" value={deepest ? fmt$(deepest.dd) : "—"} color={C.dd}
                    caption={deepest ? `${deepest.name} · net ${acct(deepest.net)}` : ""} />
              <Tile label="COVID crash · net" value={covid ? acct(covid.net) : "—"}
                    color={covid && covid.net < 0 ? C.dd : C.book}
                    caption={covid && covidOther
                      ? `${variant === "gated" ? "gate benched ORB" : "all legs traded"} · ${variant === "gated" ? "ungated" : "gated"} ${acct(covidOther.net)}`
                      : ""} />
            </div>

            {/* controls */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {(["gated", "ungated"] as const).map(v => (
                  <button key={v} onClick={() => setVariant(v)}
                          className="px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={{ background: variant === v ? "var(--accent2)" : "transparent",
                                   color: variant === v ? "#fff" : "var(--text2)" }}>
                    {v === "gated" ? "Gated (live)" : "Ungated (raw)"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>Legs</span>
                {LEGS.map(k => (
                  <button key={k} onClick={() => setLegOn(s => ({ ...s, [k]: !s[k] }))}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-colors"
                          style={{ border: `1px solid ${legOn[k] ? C[k] : "var(--border)"}`,
                                   color: legOn[k] ? "var(--text)" : "var(--muted)",
                                   background: legOn[k] ? "var(--surface)" : "transparent" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: C[k], opacity: legOn[k] ? 1 : 0.35 }} />
                    {k} <span style={{ color: "var(--muted)" }}>{fmt$(V.legtot[k], true)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* equity chart */}
            <Card title="Cumulative equity, per 1-1-1 unit"
                  sub="Crisis windows shaded (red = net-loss window). Toggle legs and gated/ungated above.">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.book} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={C.book} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  {V.crises.map(c => (
                    <ReferenceArea key={c.name} x1={ms(c.a)} x2={ms(c.b)} ifOverflow="hidden"
                      fill={c.net < 0 ? C.dd : "#6b7280"} fillOpacity={c.net < 0 ? 0.11 : 0.05}
                      label={/COVID/i.test(c.name)
                        ? { value: "ORB benched", position: "insideTop", fill: C.dd, fontSize: 10 } : undefined} />
                  ))}
                  <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]}
                         ticks={yearTicks} tick={{ fill: "var(--muted)", fontSize: 10 }}
                         tickFormatter={t => `'${String(yr(new Date(t).toISOString())).slice(2)}`} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={48}
                         tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--text2)", fontSize: 11 }}
                    labelFormatter={t => new Date(Number(t)).toISOString().slice(0, 10)}
                    formatter={(v: unknown, n: unknown) => [fmt$(Number(v), true), n === "eq" ? "Book" : String(n)]} />
                  <Area type="monotone" dataKey="eq" name="eq" stroke={C.book} strokeWidth={1.8}
                        fill="url(#eqG)" dot={false} isAnimationActive={false} />
                  {LEGS.map(k => legOn[k] && (
                    <Line key={k} type="monotone" dataKey={k} name={k} stroke={C[k]}
                          strokeWidth={1.3} dot={false} isAnimationActive={false} />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* drawdown panel */}
            <Card title="Underwater — drawdown from prior equity peak" sub="Combined book. The deepest dip is the max drawdown for the selected view.">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ddG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.dd} stopOpacity={0.05} />
                      <stop offset="100%" stopColor={C.dd} stopOpacity={0.34} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  {V.crises.map(c => (
                    <ReferenceArea key={c.name} x1={ms(c.a)} x2={ms(c.b)} ifOverflow="hidden"
                      fill={c.net < 0 ? C.dd : "#6b7280"} fillOpacity={c.net < 0 ? 0.11 : 0.05} />
                  ))}
                  <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]}
                         ticks={yearTicks} tick={{ fill: "var(--muted)", fontSize: 10 }}
                         tickFormatter={t => `'${String(yr(new Date(t).toISOString())).slice(2)}`} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={48}
                         tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--text2)", fontSize: 11 }}
                    labelFormatter={t => new Date(Number(t)).toISOString().slice(0, 10)}
                    formatter={(v: unknown) => [fmt$(Number(v)), "Underwater"]} />
                  <ReferenceLine y={0} stroke="#374151" />
                  <Area type="monotone" dataKey="dd" name="dd" stroke={C.dd} strokeWidth={1.4}
                        fill="url(#ddG)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* sortable table */}
            <Card title="Per-crisis ledger" sub={`${variant === "gated" ? "Live-tradeable (gate-open days only)" : "Raw backtest (all trades)"} · net & worst in-window drawdown, per 1 MNQ each leg. Click a header to sort.`}>
              <div className="scroll-x">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {([["name", "Crisis window", "left"], ["start", "Span", "right"],
                         ["net", "Net $", "right"], ["dd", "Max DD $", "right"],
                         ["bench", "Gated off", "left"]] as const).map(([k, lbl, al]) => (
                        <th key={k} onClick={() => setSort(k)}
                            className={`pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none ${al === "left" ? "text-left" : "text-right"}`}
                            style={{ color: sortK === k ? "var(--accent)" : "var(--muted)" }}>
                          {lbl}{arrow(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(c => {
                      const hi = /COVID/i.test(c.name)
                      return (
                        <tr key={c.name} style={{ borderBottom: "1px solid var(--border)",
                              background: hi ? "rgba(0,212,170,0.05)" : undefined }}>
                          <td className="py-2 pr-4">{c.name}</td>
                          <td className="py-2 pr-4 text-right tabular-nums" style={{ color: "var(--muted)" }}>
                            {new Date(c.a).toISOString().slice(0, 7)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums font-mono"
                              style={{ color: c.net >= 0 ? C.book : C.dd }}>{acct(c.net)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums font-mono" style={{ color: C.dd }}>
                            {c.dd < 0 ? acct(c.dd) : "—"}</td>
                          <td className="py-2 pr-4">
                            {c.bench === "—"
                              ? <span style={{ color: "var(--muted)" }}>—</span>
                              : <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                                      style={{ background: "rgba(245,158,11,0.12)", color: C.ORB }}>{c.bench}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* plain-English summary */}
            <Card title="In plain English" sub="What this means and what to expect in the next crisis">
              <div className="flex flex-col gap-4 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                <p>
                  The three strategies react to a crisis in completely different ways, and that&apos;s the point —
                  they rarely lose at the same time.
                </p>
                <ul className="flex flex-col gap-2">
                  <li><b style={{ color: C.ORB }}>ORB</b> (breakout) hates messy, choppy panics — it got chopped up
                    in COVID — but when a crisis moves in one clean direction it wins big.</li>
                  <li><b style={{ color: C.EMA }}>EMA</b> (trend) is the shock absorber: because it can bet on prices
                    falling as well as rising, it usually <i>makes</i> money in a crisis (its best run was the 2022 bear).</li>
                  <li><b style={{ color: C.DC }}>DC</b> (dip-buyer) is the wild card: it wins when a crash bounces,
                    and takes the hardest single hits when a crash keeps falling.</li>
                </ul>
                <p>
                  Because they disagree, the losses mostly cancel out. <b style={{ color: "var(--text)" }}>Not one
                  major crisis since 2010 caused the book&apos;s worst drawdown</b> — the deepest dip came from a
                  boring, choppy stretch in 2026, not a crash. A safety switch automatically benched the vulnerable
                  ORB strategy going into COVID, which is why COVID cost about −$478 instead of the ~−$3,100 it
                  would have with everything trading.
                </p>

                <div>
                  <p className="font-bold mb-2" style={{ color: "var(--text)" }}>What to expect next time</p>
                  <ul className="flex flex-col gap-2">
                    <li><b style={{ color: C.book }}>A clean, trending sell-off</b> (like 2022, or the sharp 2024/2025
                      shocks) — expect the book to do <i>well</i>. These were the best periods.</li>
                    <li><b style={{ color: WARN }}>A violent, chaotic crash</b> (like COVID) — expect a modest,
                      survivable loss, roughly $1k–$3k per 1-1-1 unit over the event, not a blow-up. The system is
                      built to bench the fragile leg when this happens.</li>
                    <li><b style={{ color: C.dd }}>The one real sting</b>{" "}— DC buying a dip that keeps falling for a
                      few days. That&apos;s exactly what the stop-losses and kill switch are sized to cap.</li>
                  </ul>
                </div>

                <p>
                  <b style={{ color: "var(--text)" }}>Bottom line:</b>{" "}there is no &ldquo;crisis blows up the
                  account&rdquo; scenario in the record. The book leans on its own disagreement to stay
                  roughly flat-to-positive through panics — the thing that actually costs money is a long, quiet,
                  directionless market where nothing trends.
                </p>
              </div>
            </Card>

            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              {data.note} Plan on ~⅔ of modeled expectancy (selection-bias haircut); the max drawdown is a
              close-to-close figure, not the ops-safety tail bound (disaster stops / kill switch / dead-man
              switch ≈ −$13.6k machine-dead crash).
            </p>
          </>
        )}
      </main>
    </div>
  )
}
