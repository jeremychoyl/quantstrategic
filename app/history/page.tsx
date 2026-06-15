import Nav from "@/components/Nav"
import { MILESTONES } from "@/lib/history"

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  infra:     { bg: "#1a1a2e", text: "#7c6af7", dot: "#7c6af7" },
  research:  { bg: "#1a2a20", text: "#00d4aa", dot: "#00d4aa" },
  execution: { bg: "#2a1a10", text: "#f59e0b", dot: "#f59e0b" },
  live:      { bg: "#3d1515", text: "#ff4d6d", dot: "#ff4d6d" },
}

const CATEGORY_LABELS: Record<string, string> = {
  infra: "Infrastructure",
  research: "Research",
  execution: "Execution",
  live: "Live",
}

export default function History() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-black">Development History</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Gekko + Gekko-Research · W2 → W62 · {MILESTONES.length} milestones
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-3 flex-wrap mb-6">
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <span key={k} className="text-xs font-semibold px-2 py-1 rounded"
                  style={{ background: CATEGORY_COLORS[k].bg, color: CATEGORY_COLORS[k].text }}>
              {label}
            </span>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[22px] top-0 bottom-0 w-px"
               style={{ background: "var(--border)" }} />

          <div className="space-y-6">
            {[...MILESTONES].reverse().map((m, i) => {
              const c = CATEGORY_COLORS[m.category]
              return (
                <div key={i} className="relative flex gap-4">
                  {/* Dot */}
                  <div className="relative z-10 flex-shrink-0 w-11 flex items-start justify-center pt-1">
                    <div className="w-3 h-3 rounded-full"
                         style={{ background: c.dot, outline: "2px solid var(--bg)" }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-sm" style={{ color: "var(--text)" }}>
                        {m.title}
                      </span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "var(--surface)", color: "var(--text2)",
                                     border: "1px solid var(--border)" }}>
                        {m.week}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: c.bg, color: c.text }}>
                        {CATEGORY_LABELS[m.category]}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{m.date}</span>
                    </div>
                    <ul className="space-y-1 mt-2">
                      {m.items.map((item, j) => (
                        <li key={j} className="flex gap-2 text-sm">
                          <span style={{ color: c.dot }} className="mt-1 flex-shrink-0">·</span>
                          <span style={{ color: "var(--text2)" }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
