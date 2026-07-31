import { Position } from "@/lib/types"
import { fmtDate } from "@/lib/data"

export default function Positions({ positions, mode }: { positions: Position[]; mode: string }) {
  const modeBadge = mode === "live"
    ? <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#3d1515", color: "#ff4d6d" }}>🚨 LIVE</span>
    : <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#1a2a24", color: "#00d4aa" }}>🎯 DEMO</span>

  if (!positions?.length) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Active Positions
          </h3>
          {modeBadge}
        </div>
        <p style={{ color: "var(--muted)" }} className="text-sm">No open positions</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3"
           style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Active Positions
        </h3>
        {modeBadge}
      </div>

      <div className="p-4 space-y-3">
        {positions.map((p, i) => {
          const up = p.pnl_pts >= 0
          return (
            <div key={i}
                 className="rounded-lg px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                 style={{
                   background: up ? "#12241d" : "#2e1418",
                   border: `1px solid ${up ? "var(--up)" : "var(--down)"}`,
                   boxShadow: up ? "0 0 24px rgba(0,212,170,0.18)" : "0 0 24px rgba(255,77,109,0.16)",
                 }}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black leading-none" style={{ color: "#facc15", fontSize: "1.8rem" }}>
                    {p.strategy}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                        style={{ background: "rgba(0,0,0,0.3)",
                                 color: p.direction === "Long" ? "var(--up)" : "var(--down)",
                                 border: `1px solid ${p.direction === "Long" ? "var(--up)" : "var(--down)"}` }}>
                    {p.direction}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{p.size}</span>
                </div>
                <div className="mt-1.5" style={{ color: "var(--muted)", fontSize: "1.35rem" }}>
                  <span style={{ color: "#ffffff" }}>
                    Entry {fmtDate(p.entry_date)} @ {p.entry_px.toLocaleString()}
                  </span>
                  &nbsp;·&nbsp;
                  Current {p.current_px.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl sm:text-5xl font-black leading-none tabular-nums"
                   style={{ color: up ? "var(--up)" : "var(--down)" }}>
                  {p.pnl_usd >= 0 ? "+" : "-"}${Math.abs(p.pnl_usd).toFixed(0)}
                </p>
                <p className="text-sm font-medium mt-1" style={{ color: up ? "var(--up)" : "var(--down)" }}>
                  {up ? "+" : ""}{p.pnl_pts.toFixed(2)} pts
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
