"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"

// Front 5 — original operational tabs
const MAIN = [
  { href: "/",             label: "Overview"   },
  { href: "/details",      label: "Details"    },
  { href: "/expected",     label: "Projection" },
  { href: "/configurator", label: "Strategies" },
  { href: "/swing",        label: "Swing"      },
  { href: "/history",      label: "History"    },
]

// Last 5 — analytical / investor deck, under the More ▾ dropdown
const MORE = [
  { href: "/factsheet",   label: "Factsheet"   },
  { href: "/performance", label: "Performance" },
  { href: "/analysis",    label: "Analysis"    },
  { href: "/risk",        label: "Risk"        },
  { href: "/methodology", label: "Method"      },
]

export default function Nav({ generatedAt }: { generatedAt?: string }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const age = generatedAt
    ? Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000)
    : null

  const moreActive = MORE.some(t => t.href === path)

  const tabStyle = (active: boolean) => ({
    background: active ? "var(--accent2)" : "transparent",
    color: active ? "#fff" : "var(--text2)",
  })

  return (
    <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
            className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight" style={{ color: "var(--accent)" }}>
            QuantStrategic
          </span>
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded font-mono"
                style={{ background: "#1a2a24", color: "var(--accent)", border: "1px solid #1e3a30" }}>
            MNQ
          </span>
        </div>

        <nav className="flex gap-1 items-center">
          {MAIN.map(t => (
            <Link key={t.href} href={t.href}
                  className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  style={tabStyle(path === t.href)}>
              {t.label}
            </Link>
          ))}

          {/* More ▾ dropdown */}
          <div className="relative" ref={ref}>
            <button onClick={() => setOpen(o => !o)}
                    className="px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1"
                    style={tabStyle(moreActive)}>
              More
              <span className="text-[10px]" style={{ transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 rounded-lg overflow-hidden min-w-[160px] z-50"
                   style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                {MORE.map(t => (
                  <Link key={t.href} href={t.href} onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-sm font-medium transition-colors"
                        style={{
                          background: path === t.href ? "var(--accent2)" : "transparent",
                          color: path === t.href ? "#fff" : "var(--text2)",
                        }}>
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="text-xs" style={{ color: "var(--muted)" }}>
          {age !== null ? (
            <span className={age > 15 ? "text-yellow-400" : ""}>
              {age === 0 ? "live" : `${age}m ago`}
            </span>
          ) : "—"}
        </div>
      </div>
    </header>
  )
}
