import { PortfolioStats } from "@/lib/types"

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg p-4"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1"
         style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )
}

export default function StatsGrid({ stats }: { stats: PortfolioStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Stat label="Profit Factor" value={stats.pf.toFixed(2)}
            sub="2026 OOS · both strategies" />
      <Stat label="Sharpe Ratio" value={stats.sharpe.toFixed(2)}
            sub="annualised · combined" />
      <Stat label="Win Rate" value={`${stats.win_pct.toFixed(0)}%`}
            sub={`${stats.trade_days} trade days`} />
      <Stat label="Max Drawdown" value={`$${stats.max_dd_usd.toLocaleString()}`}
            sub="combined portfolio" />
      <Stat label="Total Points" value={`+${stats.total_pts.toFixed(0)}`}
            sub="Jan 2026 → now" />
      <Stat label="Total P&L" value={`+$${stats.total_usd.toLocaleString()}`}
            sub="1 MNQ per strategy" />
    </div>
  )
}
