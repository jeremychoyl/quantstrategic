"use client"
import { NetReturns } from "@/lib/types"
import { fmtPts, fmtUsd, fmtPct } from "@/lib/data"

export default function ReturnsHero({ returns }: { returns: NetReturns }) {
  const ytdUp  = returns.ytd_pts >= 0
  const fivdUp = returns["5d_pts"] >= 0

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* YTD */}
      <div className="rounded-xl p-4 sm:p-6 col-span-2 sm:col-span-1"
           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
           style={{ color: "var(--muted)" }}>YTD 2026</p>
        <p className="text-4xl sm:text-5xl font-black tracking-tight"
           style={{ color: ytdUp ? "var(--up)" : "var(--down)" }}>
          {fmtPct(returns.ytd_pct)}
        </p>
        <p className="text-xl sm:text-2xl font-bold mt-1"
           style={{ color: ytdUp ? "var(--up)" : "var(--down)" }}>
          {fmtUsd(returns.ytd_usd)}
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {fmtPts(returns.ytd_pts)}
        </p>
      </div>

      {/* 5-day */}
      <div className="rounded-xl p-4 sm:p-6 col-span-2 sm:col-span-1"
           style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
           style={{ color: "var(--muted)" }}>Last 5 Days</p>
        <p className="text-4xl sm:text-5xl font-black tracking-tight"
           style={{ color: fivdUp ? "var(--up)" : "var(--down)" }}>
          {fmtUsd(returns["5d_usd"])}
        </p>
        <p className="text-xl sm:text-2xl font-bold mt-1"
           style={{ color: fivdUp ? "var(--up)" : "var(--down)" }}>
          {fmtPct(returns["5d_pct"])}
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {fmtPts(returns["5d_pts"])}
        </p>
      </div>
    </div>
  )
}
