"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"

// Front 5 — the tabs worth a click without opening a menu. Kept to five on
// purpose: on a tablet this is a single flex row with no wrap, and seven
// crowded it. Adding a sixth means demoting one.
//
// On a PHONE none of this row renders — the whole thing needs ~650px and a
// phone has ~390px, which used to push the header off-screen and take the
// page's horizontal scroll with it. Below `sm` we show a sheet instead, and
// the MAIN/MORE split stops mattering: the sheet lists everything.
const MAIN = [
  { href: "/",             label: "Overview"   },
  { href: "/details",      label: "Details"    },
  { href: "/expected",     label: "Projection" },
  { href: "/configurator", label: "Strategies" },
  { href: "/tradingview",  label: "TradingView"},
]

// Everything else, under the More ▾ dropdown. Swing and History moved here
// 2026-08-16 to get MAIN back to five.
const MORE = [
  { href: "/swing",       label: "Swing"       },
  { href: "/history",     label: "History"     },
  { href: "/factsheet",   label: "Factsheet"   },
  { href: "/performance", label: "Performance" },
  { href: "/analysis",    label: "Analysis"    },
  { href: "/risk",        label: "Risk"        },
  { href: "/crisis",      label: "Crisis"      },
  { href: "/methodology", label: "Method"      },
]

const ALL = [...MAIN, ...MORE]

export default function Nav({ generatedAt }: { generatedAt?: string }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)      // desktop More ▾
  const [sheet, setSheet] = useState(false)    // mobile full menu
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // pointerdown, not mousedown: on touch the emulated mouse event arrives
    // ~300ms late, so the dropdown stayed open under the finger.
    const h = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", h)
    return () => document.removeEventListener("pointerdown", h)
  }, [])

  // Close both menus whenever the route changes. The desktop dropdown did this
  // via each link's onClick; the sheet has too many links to rely on that, and
  // a back-button navigation fires no click at all.
  useEffect(() => { setOpen(false); setSheet(false) }, [path])

  const age = generatedAt
    ? Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000)
    : null

  const moreActive = MORE.some(t => t.href === path)
  const current = ALL.find(t => t.href === path)

  const tabStyle = (active: boolean) => ({
    background: active ? "var(--accent2)" : "transparent",
    color: active ? "#fff" : "var(--text2)",
  })

  const ageEl = age !== null ? (
    <span className={age > 15 ? "text-yellow-400" : ""}>
      {age === 0 ? "live" : `${age}m ago`}
    </span>
  ) : "—"

  return (
    <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
            className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap"
                style={{ color: "var(--accent)" }}>
            QuantStrategic
          </span>
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded font-mono"
                style={{ background: "#1a2a24", color: "var(--accent)", border: "1px solid #1e3a30" }}>
            MNQ
          </span>
          {/* On a phone the tab row is gone, so the header would no longer say
              which page you are on. */}
          {current && current.href !== "/" && (
            <span className="sm:hidden text-xs truncate" style={{ color: "var(--muted)" }}>
              / {current.label}
            </span>
          )}
        </div>

        {/* ── Tablet + desktop: the tab row ── */}
        <nav className="hidden sm:flex gap-1 items-center">
          {MAIN.map(t => (
            <Link key={t.href} href={t.href}
                  className="px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap"
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

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs" style={{ color: "var(--muted)" }}>{ageEl}</div>

          {/* ── Phone: hamburger ── */}
          <button onClick={() => setSheet(s => !s)}
                  aria-label={sheet ? "Close menu" : "Open menu"}
                  aria-expanded={sheet}
                  className="flex sm:hidden items-center justify-center rounded px-2 -mr-2 tap-target"
                  style={{ color: "var(--text2)" }}>
            <span className="text-xl leading-none">{sheet ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* ── Phone menu sheet ──
          Two columns: 13 destinations in one column would run past the fold on a
          small phone, and this menu exists to be one tap deep. */}
      {sheet && (
        <div className="sm:hidden border-t" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <nav className="grid grid-cols-2 gap-1 p-3">
            {ALL.map(t => (
              <Link key={t.href} href={t.href}
                    className="flex items-center px-3 rounded text-sm font-medium tap-target"
                    style={tabStyle(path === t.href)}>
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
