import { PortfolioStats } from "@/lib/types"

interface Rating { stars: number; label: string }

function rate(metric: "pf" | "sharpe" | "maxdd" | "winpct", value: number, capital = 25000): Rating {
  switch (metric) {
    case "pf":
      if (value >= 2.5) return { stars: 5, label: "Excellent" }
      if (value >= 1.8) return { stars: 4, label: "Strong" }
      if (value >= 1.3) return { stars: 3, label: "Solid" }
      if (value >= 1.0) return { stars: 2, label: "Marginal" }
      return { stars: 1, label: "Poor" }
    case "sharpe":
      if (value >= 3.0) return { stars: 5, label: "Excellent" }
      if (value >= 2.0) return { stars: 4, label: "Strong" }
      if (value >= 1.5) return { stars: 3, label: "Solid" }
      if (value >= 1.0) return { stars: 2, label: "Marginal" }
      return { stars: 1, label: "Poor" }
    case "maxdd": {
      const pct = (value / capital) * 100
      if (pct < 5)  return { stars: 5, label: "Excellent" }
      if (pct < 10) return { stars: 4, label: "Strong" }
      if (pct < 15) return { stars: 3, label: "Acceptable" }
      if (pct < 25) return { stars: 2, label: "Elevated" }
      return { stars: 1, label: "High" }
    }
    case "winpct":
      if (value >= 60) return { stars: 5, label: "Excellent" }
      if (value >= 55) return { stars: 4, label: "Strong" }
      if (value >= 50) return { stars: 3, label: "Solid" }
      if (value >= 45) return { stars: 2, label: "Marginal" }
      return { stars: 1, label: "Low" }
  }
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-base leading-none tracking-tighter">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? "#FBBF24" : "#374151" }}>★</span>
      ))}
    </span>
  )
}

function Stat({
  label, value, sub, rating,
}: { label: string; value: string; sub?: string; rating?: Rating }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1"
         style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest"
         style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
      {rating && (
        <div className="flex items-center gap-1.5">
          <Stars n={rating.stars} />
          <span className="text-xs" style={{ color: "var(--muted)" }}>{rating.label}</span>
        </div>
      )}
      {sub && <p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  )
}

export default function StatsGrid({ stats, capital = 25000 }: { stats: PortfolioStats; capital?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Stat label="Profit Factor" value={stats.pf.toFixed(2)}
            rating={rate("pf", stats.pf)}
            sub="2026 OOS · all strategies" />
      <Stat label="Sharpe Ratio" value={stats.sharpe.toFixed(2)}
            rating={rate("sharpe", stats.sharpe)}
            sub="annualised · combined" />
      <Stat label="Win Rate" value={`${stats.win_pct.toFixed(0)}%`}
            rating={rate("winpct", stats.win_pct)}
            sub={`${stats.trade_days} trade days`} />
      <Stat label="Max Drawdown" value={`$${stats.max_dd_usd.toLocaleString()}`}
            rating={rate("maxdd", stats.max_dd_usd, capital)}
            sub="combined portfolio" />
      <Stat label="Total Points" value={`+${stats.total_pts.toFixed(0)}`}
            sub="Jan 2026 → now" />
      <Stat label="Total P&L" value={`+$${stats.total_usd.toLocaleString()}`}
            sub="1 MNQ per strategy" />
    </div>
  )
}
