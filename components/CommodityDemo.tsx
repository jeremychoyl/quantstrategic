"use client"
import {
  CommodityDemo as CommodityDemoData,
  CommodityDemoStrategy,
  CommodityDemoPosition,
  CommodityDemoFill,
} from "@/lib/types"

const UP   = "#00d4aa"
const DOWN = "#ff4d6d"

// amber "◐ Demo" sandbox palette — matches BookProjection StatusPill demo treatment
const AMBER     = "#fbbf24"
const AMBER_BG  = "#2a2810"
const AMBER_BRD = "#854d0e"

const fmt$ = (v: number, sign = false) => {
  const s = v < 0 ? "−" : sign && v > 0 ? "+" : ""
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}`
}

function DemoPill() {
  return (
    <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
          style={{ background: AMBER_BG, color: AMBER, border: `1px solid ${AMBER_BRD}` }}>
      ◐ Demo (sandbox)
    </span>
  )
}

export default function CommodityDemo({ demo }: { demo: CommodityDemoData }) {
  const book = demo.book
  const strategies = Object.values(demo.per_strategy)
  const positions  = demo.open_positions ?? []
  const fills      = demo.recent_fills ?? []
  const isEmpty    = book.n_trades === 0 && positions.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h2 className="text-base font-black tracking-tight">Gold / Crude — Demo P&amp;L</h2>
        <DemoPill />
      </div>
      <p className="text-xs -mt-2" style={{ color: "var(--muted)" }}>{demo.note}</p>

      {/* Combined demo book summary — always shown */}
      <div className="rounded-xl overflow-hidden"
           style={{ background: AMBER_BG, border: `1px solid ${AMBER_BRD}` }}>
        <div className="grid grid-cols-2">
          <div className="p-4 flex flex-col gap-1" style={{ borderRight: `1px solid ${AMBER_BRD}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: AMBER, opacity: 0.85 }}>
              Demo Book Realized
            </p>
            <p className="text-xl font-bold tabular-nums"
               style={{ color: book.realized_usd > 0 ? UP : book.realized_usd < 0 ? DOWN : "var(--text)" }}>
              {fmt$(book.realized_usd, true)}
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>isolated from live MNQ book</p>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: AMBER, opacity: 0.85 }}>
              Demo Trades
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
              {book.n_trades.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>1 micro each · MGC + MCL</p>
          </div>
        </div>
      </div>

      {isEmpty ? (
        /* Empty state — intentional placeholder, no broken tables */
        <div className="rounded-xl p-8 text-center"
             style={{ background: "var(--surface)", border: `1px dashed ${AMBER_BRD}` }}>
          <p className="text-2xl mb-2" style={{ color: AMBER }}>◐</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            No demo fills yet
          </p>
          <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: "var(--muted)" }}>
            Gold/Crude enter short on a new 10-day high. Waiting for first signal.
          </p>
        </div>
      ) : (
        <>
          {/* Per-strategy breakdown */}
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold mb-0.5">Per-Strategy Realized</h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              1 micro contract each · today / week / all-time
            </p>

            {/* desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Strategy", "Today $", "Week $", "All-time $", "Trades"].map((h, i) => (
                      <th key={h} className={`pb-2 text-xs font-semibold ${i === 0 ? "text-left" : "text-right"} pr-5`}
                          style={{ color: "var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((s: CommodityDemoStrategy) => (
                    <tr key={s.name} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-3 pr-5 text-sm font-bold" style={{ color: "var(--text)" }}>{s.name}</td>
                      <td className="py-3 pr-5 text-sm font-bold tabular-nums text-right"
                          style={{ color: s.today_usd > 0 ? UP : s.today_usd < 0 ? DOWN : "var(--muted)" }}>{fmt$(s.today_usd, true)}</td>
                      <td className="py-3 pr-5 text-sm tabular-nums text-right"
                          style={{ color: s.week_usd > 0 ? UP : s.week_usd < 0 ? DOWN : "var(--muted)" }}>{fmt$(s.week_usd, true)}</td>
                      <td className="py-3 pr-5 text-sm font-bold tabular-nums text-right"
                          style={{ color: s.all_time_usd > 0 ? UP : s.all_time_usd < 0 ? DOWN : "var(--muted)" }}>{fmt$(s.all_time_usd, true)}</td>
                      <td className="py-3 text-sm tabular-nums text-right" style={{ color: "var(--text2)" }}>{s.n_trades}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="sm:hidden space-y-3">
              {strategies.map((s: CommodityDemoStrategy) => (
                <div key={s.name} className="rounded-lg p-3"
                     style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{s.name}</span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{s.n_trades} trades</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "Today",    v: s.today_usd },
                      { l: "Week",     v: s.week_usd },
                      { l: "All-time", v: s.all_time_usd },
                    ].map(x => (
                      <div key={x.l}>
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{x.l}</p>
                        <p className="text-sm font-bold tabular-nums"
                           style={{ color: x.v > 0 ? UP : x.v < 0 ? DOWN : "var(--muted)" }}>{fmt$(x.v, true)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open positions */}
          {positions.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-3">Open Demo Positions</h3>
              <div className="space-y-2">
                {positions.map((p: CommodityDemoPosition, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3"
                       style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{p.strategy}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                            style={{ background: AMBER_BG, color: AMBER, border: `1px solid ${AMBER_BRD}` }}>
                        {p.direction}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{p.size}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                      <span>entry <span className="font-bold" style={{ color: "var(--text)" }}>{p.entry_px}</span></span>
                      <span>signal {p.signal_close}</span>
                      <span style={{ color: "var(--muted)" }}>{p.entry_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent fills */}
          {fills.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-3">Recent Demo Fills</h3>
              <div className="space-y-1.5">
                {fills.map((f: CommodityDemoFill, i) => {
                  const isExit = f.pnl_usd !== 0
                  return (
                    <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-2"
                         style={{ borderBottom: i < fills.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] tabular-nums" style={{ color: "var(--muted)" }}>
                          {f.ts.replace("T", " ")}
                        </span>
                        <span className="text-sm font-bold">{f.strategy}</span>
                        <span className="text-xs" style={{ color: "var(--text2)" }}>{f.action}</span>
                      </div>
                      <div className="flex items-center gap-4 tabular-nums">
                        <span className="text-xs" style={{ color: "var(--text2)" }}>@ {f.price}</span>
                        {isExit && (
                          <span className="text-sm font-bold" style={{ color: f.pnl_usd >= 0 ? UP : DOWN }}>
                            {fmt$(f.pnl_usd, true)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
