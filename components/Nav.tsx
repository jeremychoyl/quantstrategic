"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/",             label: "Overview"   },
  { href: "/details",      label: "Details"    },
  { href: "/risk",         label: "Risk"       },
  { href: "/expected",     label: "Projection" },
  { href: "/configurator", label: "Strategies" },
  { href: "/history",      label: "History"    },
]

export default function Nav({ generatedAt }: { generatedAt?: string }) {
  const path = usePathname()

  const age = generatedAt
    ? Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000)
    : null

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

        <nav className="flex gap-1">
          {TABS.map(t => (
            <Link key={t.href} href={t.href}
                  className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  style={{
                    background: path === t.href ? "var(--accent2)" : "transparent",
                    color: path === t.href ? "#fff" : "var(--text2)",
                  }}>
              {t.label}
            </Link>
          ))}
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
