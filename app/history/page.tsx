import Nav from "@/components/Nav"
import { MILESTONES } from "@/lib/history"

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  infra:     { bg: "#1a1a2e", text: "#7c6af7", dot: "#7c6af7" },
  research:  { bg: "#1a2a20", text: "#00d4aa", dot: "#00d4aa" },
  execution: { bg: "#2a1a10", text: "#f59e0b", dot: "#f59e0b" },
  live:      { bg: "#3d1515", text: "#ff4d6d", dot: "#ff4d6d" },
}

const CATEGORY_LABELS: Record<string, string> = {
  infra:     "Infrastructure",
  research:  "Research",
  execution: "Execution",
  live:      "Live",
}

export default function History() {
  const reversed = [...MILESTONES].reverse()

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-black">Development History</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Gekko + Gekko-Research · 2026-05-27 → 06-30 · W2 → W73 · {MILESTONES.length} milestones · live since 2026-06-23
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-2 flex-wrap mb-5">
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <span key={k} className="text-xs font-semibold px-2 py-1 rounded"
                  style={{ background: CATEGORY_COLORS[k].bg, color: CATEGORY_COLORS[k].text }}>
              {label}
            </span>
          ))}
        </div>

        {/* Compact list */}
        <div className="rounded-xl overflow-hidden"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {reversed.map((m, i) => {
            const c = CATEGORY_COLORS[m.category]
            return (
              <div key={i}
                   className="flex items-center gap-3 px-4 py-2.5"
                   style={{ borderBottom: i < reversed.length - 1 ? "1px solid var(--border)" : "none" }}>
                {/* week badge */}
                <span className="text-xs font-black tabular-nums min-w-[36px]"
                      style={{ color: "var(--muted)" }}>
                  {m.week}
                </span>

                {/* date */}
                <span className="text-xs tabular-nums min-w-[52px]"
                      style={{ color: "var(--muted)", opacity: 0.6 }}>
                  {m.date}
                </span>

                {/* category dot */}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{ background: c.bg, color: c.text }}>
                  {CATEGORY_LABELS[m.category]}
                </span>

                {/* title */}
                <span className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--text2)" }}>
                  {m.title}
                </span>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
