// Reference-scale footnote for the ★ ratings — institutional (allocator
// due-diligence) ranges. Shown at the bottom of the Projection & Strategies tabs.
const SCALE: { m: string; r: string; note?: string }[] = [
  { m: "Sharpe",          r: "<1 Weak · 1–1.5 Acceptable · 1.5–2 Good · 2–3 Very strong · >3 Elite" },
  { m: "Sortino",         r: "<1.5 Weak · 1.5–2 Acceptable · 2–3 Good · 3–4 Very strong · >4 Elite" },
  { m: "Profit factor",   r: "<1.2 Weak · 1.2–1.5 Acceptable · 1.5–2 Good · 2–3 Very strong · >3 Elite" },
  { m: "Recovery factor", r: "<1 Weak · 1–2 Acceptable · 2–3 Good · 3–5 Very strong · >5 Elite" },
  { m: "Calmar",          r: "<0.5 Weak · 0.5–1 Acceptable · 1–2 Good · 2–3 Very strong · >3 Elite", note: "house scale" },
  { m: "Payoff ratio",    r: "<1 Weak · 1–1.5 Acceptable · 1.5–2 Good · 2–3 Very strong · >3 Elite", note: "supplementary" },
  { m: "Max drawdown",    r: ">30% Weak · 20–30% Acceptable · 15–20% Good · 10–15% Very strong · <10% Elite", note: "% of capital" },
]

export default function RatingLegend() {
  return (
    <div className="rounded-xl p-5 text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm font-bold" style={{ color: "var(--text)" }}>★ Rating scale</span>
        <span style={{ color: "var(--muted)" }}>— institutional (allocator due-diligence) ranges</span>
      </div>
      <p className="mb-3" style={{ color: "var(--muted)" }}>
        Stars map each metric onto the ranges allocators use when evaluating quant funds:
        <span style={{ color: "#FBBF24" }}> ★☆☆☆☆ Weak</span> →
        <span style={{ color: "#FBBF24" }}> ★★★★★ Elite</span>. Higher is better for the ratios; the
        risk tiles (concentration · losing streak · drawdown length) use the inverse — lower earns more stars.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
        {SCALE.map(s => (
          <div key={s.m} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="font-semibold whitespace-nowrap" style={{ color: "var(--text)" }}>
              {s.m}
              {s.note && <span className="ml-1 font-normal text-[10px]" style={{ color: "var(--muted)", opacity: 0.7 }}>({s.note})</span>}
            </span>
            <span className="tabular-nums" style={{ color: "var(--muted)" }}>{s.r}</span>
          </div>
        ))}
      </div>
      <p className="mt-3" style={{ color: "var(--muted)", opacity: 0.8 }}>
        Win rate is shown for context, not star-rated — it&apos;s meaningless without risk:reward (a 25% win rate
        with a 7× payoff is excellent). The allocator priority order is Sharpe → Max drawdown → Calmar.
      </p>
    </div>
  )
}
