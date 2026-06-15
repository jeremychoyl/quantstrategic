"use client"
import { DashboardData } from "@/lib/types"
import { fmtPct, fmtUsd, fmtPts } from "@/lib/data"
import { useState } from "react"

export default function ShareCard({ data }: { data: DashboardData }) {
  const [show, setShow] = useState(false)
  const r    = data.net_returns
  const s    = data.portfolio_stats
  const ytdUp = r.ytd_pts >= 0

  return (
    <>
      <button onClick={() => setShow(true)}
              className="text-xs px-3 py-1.5 rounded font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--accent2)", color: "#fff" }}>
        Share Card
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: "rgba(0,0,0,0.8)" }}
             onClick={() => setShow(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl">
            {/* Card — screenshot this */}
            <div id="share-card"
                 className="rounded-2xl p-8"
                 style={{ background: "#0d1117", border: "1px solid #21262d", fontFamily: "system-ui" }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-2xl font-black" style={{ color: "#00d4aa" }}>QuantStrategic</p>
                  <p className="text-sm" style={{ color: "#6b7280" }}>MNQ Futures · Systematic · {data.bridge_mode.toUpperCase()}</p>
                </div>
                <p className="text-xs" style={{ color: "#6b7280" }}>{new Date(data.generated_at).toLocaleDateString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl p-5" style={{ background: "#161b22" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>YTD 2026</p>
                  <p className="text-5xl font-black" style={{ color: ytdUp ? "#00d4aa" : "#ff4d6d" }}>
                    {fmtPct(r.ytd_pct)}
                  </p>
                  <p className="text-xl font-bold mt-1" style={{ color: ytdUp ? "#00d4aa" : "#ff4d6d" }}>
                    {fmtUsd(r.ytd_usd)}
                  </p>
                </div>
                <div className="rounded-xl p-5" style={{ background: "#161b22" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Last 5 Days</p>
                  <p className="text-5xl font-black" style={{ color: r["5d_pts"] >= 0 ? "#00d4aa" : "#ff4d6d" }}>
                    {fmtUsd(r["5d_usd"])}
                  </p>
                  <p className="text-xl font-bold mt-1" style={{ color: r["5d_pts"] >= 0 ? "#00d4aa" : "#ff4d6d" }}>
                    {fmtPts(r["5d_pts"])}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  ["Profit Factor", s.pf.toFixed(2)],
                  ["Sharpe", s.sharpe.toFixed(2)],
                  ["Win Rate", `${s.win_pct.toFixed(0)}%`],
                  ["Max DD", `$${s.max_dd_usd.toLocaleString()}`],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg p-3 text-center" style={{ background: "#161b22" }}>
                    <p className="text-xs" style={{ color: "#6b7280" }}>{l}</p>
                    <p className="text-lg font-bold" style={{ color: "#e2e8f0" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-center text-xs mt-3" style={{ color: "#6b7280" }}>
              Screenshot the card above to share · click outside to close
            </p>
          </div>
        </div>
      )}
    </>
  )
}
