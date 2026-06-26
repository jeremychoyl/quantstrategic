"use client"
import { Strategy } from "@/lib/types"
import { useState } from "react"

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string; border: string }> = {
  active:    { bg: "#1a2a24", color: "var(--up)",      label: "● ACTIVE",    border: "var(--accent)" },
  demo:      { bg: "#2a2810", color: "#fbbf24",        label: "◐ DEMO",      border: "#854d0e" },
  validated: { bg: "#16172a", color: "var(--accent2)", label: "✓ VALIDATED", border: "#3b337a" },
  shelved:   { bg: "#2a2212", color: "#f59e0b",        label: "⏸ SHELVED",   border: "#78350f" },
  default:   { bg: "#1e1e2e", color: "var(--muted)",   label: "INACTIVE",    border: "var(--border)" },
}

export default function StrategyCard({ strat, data }: { strat: string; data: Strategy }) {
  const [open, setOpen] = useState(false)
  const s = STATUS_STYLE[data.status] ?? STATUS_STYLE.default

  return (
    <>
      <button onClick={() => setOpen(true)}
              className="rounded-xl p-5 text-left w-full transition-all hover:scale-[1.01]"
              style={{ background: "var(--surface)", border: `1px solid ${s.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-black text-base">{data.name}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: s.bg, color: s.color }}>
            {s.label}
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--text2)" }}>{data.description}</p>
        <p className="text-xs mt-3" style={{ color: "var(--accent)" }}>Click to view parameters →</p>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: "rgba(0,0,0,0.8)" }}
             onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()}
               className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
               style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black">{data.name}</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{data.description}</p>
              </div>
              <button onClick={() => setOpen(false)}
                      className="text-2xl leading-none" style={{ color: "var(--muted)" }}>×</button>
            </div>

            <div className="space-y-2">
              {Object.entries(data.params).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2"
                     style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>{k}</span>
                  <span className="text-sm font-bold text-right" style={{ color: "var(--text)" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
