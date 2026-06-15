import { Position } from "@/lib/types"

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

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {positions.map((p, i) => {
          const up = p.pnl_pts >= 0
          return (
            <div key={i} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base" style={{ color: "var(--text)" }}>
                    {p.strategy}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                        style={{ background: p.direction === "Long" ? "#1a2a24" : "#3d1515",
                                 color: p.direction === "Long" ? "var(--up)" : "var(--down)" }}>
                    {p.direction}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{p.size}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  Entry {p.entry_date} @ {p.entry_px.toLocaleString()}
                  &nbsp;·&nbsp;
                  Current {p.current_px.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: up ? "var(--up)" : "var(--down)" }}>
                  {up ? "+" : ""}{p.pnl_usd >= 0 ? "+" : "-"}${Math.abs(p.pnl_usd).toFixed(0)}
                </p>
                <p className="text-sm font-medium" style={{ color: up ? "var(--up)" : "var(--down)" }}>
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
