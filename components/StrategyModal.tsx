"use client"
import { Strategy } from "@/lib/types"
import { useState } from "react"

export default function StrategyCard({ strat, data }: { strat: string; data: Strategy }) {
  const [open, setOpen] = useState(false)
  const active = data.in_portfolio

  return (
    <>
      <button onClick={() => setOpen(true)}
              className="rounded-xl p-5 text-left w-full transition-all hover:scale-[1.01]"
              style={{ background: "var(--surface)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-black text-base">{data.name}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: active ? "#1a2a24" : "#1e1e2e",
                         color: active ? "var(--up)" : "var(--muted)" }}>
            {active ? "● ACTIVE" : "INACTIVE"}
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
