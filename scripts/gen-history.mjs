#!/usr/bin/env node
// Generates lib/history.ts from scripts/milestones.json + the gekko project memory files.
//
// WHY: the Development History dates used to be hand-edited and drifted badly (early
// milestones were off by up to 8 months). This script makes lib/history.ts a generated
// artifact whose dates are DERIVED from the memory files and validated against them, so
// they can no longer silently drift.
//
// Usage:
//   npm run gen:history            # regenerate lib/history.ts
//   npm run gen:history -- --check # verify lib/history.ts is up to date (exit 1 if not)
//
// Date resolution per milestone (source = a file in the memory dir):
//   dateMode "content" (default) → first ISO (YYYY-MM-DD) date found in the source file
//   dateMode "mtime"             → the source file's modification date (for memory files
//                                  with no in-body completion date)
//   explicit "date"              → used as-is, but MUST appear in the source file text
//
// Memory dir: $GEKKO_MEMORY_DIR, else the default local path below.

import { readFileSync, writeFileSync, statSync, existsSync, readdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..")
const OUT = join(REPO, "lib", "history.ts")
const MANIFEST = join(HERE, "milestones.json")
const MEMORY_DIR =
  process.env.GEKKO_MEMORY_DIR ||
  "/Users/gordongekko/.claude/projects/-Users-gordongekko-gekko/memory"

const ISO = /(\d{4})-(\d{2})-(\d{2})/

function die(msg) {
  console.error(`✗ gen-history: ${msg}`)
  process.exit(1)
}

function mtimeDate(path) {
  const d = statSync(path).mtime
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function resolveDate(m) {
  const srcPath = join(MEMORY_DIR, m.source)
  if (!existsSync(srcPath)) die(`${m.week}: source memory file not found: ${m.source}`)

  if (m.dateMode === "mtime") return mtimeDate(srcPath)

  const text = readFileSync(srcPath, "utf8")
  if (m.date) {
    if (!text.includes(m.date))
      die(`${m.week}: explicit date ${m.date} does not appear in ${m.source} (drift?)`)
    return m.date
  }
  const match = text.match(ISO)
  if (!match) die(`${m.week}: no ISO date in ${m.source}; add "date" or "dateMode":"mtime"`)
  return match[0]
}

// Weekend numbers a milestone's week-label covers, e.g. "W4–W8" → [4,5,6,7,8].
function weeksInLabel(label) {
  const out = []
  for (const part of label.split(/[,·]/)) {
    const m = part.match(/W?(\d+)\s*[–-]\s*W?(\d+)/) // range (en-dash or hyphen)
    if (m) {
      for (let n = +m[1]; n <= +m[2]; n++) out.push(n)
    } else {
      const s = part.match(/W?(\d+)/)
      if (s) out.push(+s[1])
    }
  }
  return out
}

// Warn about weekend memory files whose number isn't represented by any milestone —
// the signal that a new weekend (or an intentionally-skipped one) needs a decision.
function coverageWarnings(coveredWeeks) {
  const missing = readdirSync(MEMORY_DIR)
    .map((f) => f.match(/^gekko-weekend([\d-]+)-done\.md$/))
    .filter(Boolean)
    .filter((m) => m[1].split("-").every((n) => !coveredWeeks.has(+n)))
    .map((m) => `W${m[1]}`)
  if (missing.length)
    console.warn(
      `⚠ ${missing.length} weekend(s) not represented on the timeline: ${missing.sort().join(", ")}\n` +
        `   (add to scripts/milestones.json — or fold into an existing range — if they should appear.)`
    )
}

function build() {
  const { milestones } = JSON.parse(readFileSync(MANIFEST, "utf8"))
  const coveredWeeks = new Set()
  const rows = milestones.map((m) => {
    weeksInLabel(m.week).forEach((n) => coveredWeeks.add(n))
    return {
      week: m.week,
      date: resolveDate(m),
      title: m.title,
      items: m.items,
      category: m.category,
    }
  })

  // sanity: dates should be non-decreasing in manifest order
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].date < rows[i - 1].date)
      console.warn(
        `⚠ out-of-order date: ${rows[i].week} (${rows[i].date}) precedes ${rows[i - 1].week} (${rows[i - 1].date})`
      )
  }

  coverageWarnings(coveredWeeks)

  const body = rows
    .map(
      (r) =>
        `  {\n` +
        `    week: ${JSON.stringify(r.week)}, date: ${JSON.stringify(r.date)}, category: ${JSON.stringify(r.category)},\n` +
        `    title: ${JSON.stringify(r.title)},\n` +
        `    items: ${JSON.stringify(r.items)},\n` +
        `  },`
    )
    .join("\n")

  return `// GENERATED FILE — DO NOT EDIT.
// Source of truth: scripts/milestones.json + gekko project memory files.
// Dates are derived from memory and validated against it. Regenerate with:
//   npm run gen:history
export interface Milestone {
  week: string
  date: string
  title: string
  items: string[]
  category: "infra" | "research" | "execution" | "live"
}

export const MILESTONES: Milestone[] = [
${body}
]
`
}

const isCheck = process.argv.includes("--check")

// The memory dir only exists on the author's machine. In --check mode (pre-commit /
// CI on another machine) skip gracefully rather than blocking the commit.
if (!existsSync(MEMORY_DIR)) {
  if (isCheck) {
    console.warn(`⚠ memory dir not found (${MEMORY_DIR}); skipping history check`)
    process.exit(0)
  }
  die(`memory dir not found: ${MEMORY_DIR} (set GEKKO_MEMORY_DIR)`)
}

const out = build()

if (isCheck) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : ""
  if (current !== out) {
    console.error("✗ lib/history.ts is out of date. Run: npm run gen:history")
    process.exit(1)
  }
  console.log("✓ lib/history.ts is up to date")
} else {
  writeFileSync(OUT, out)
  const n = JSON.parse(readFileSync(MANIFEST, "utf8")).milestones.length
  console.log(`✓ wrote ${OUT} (${n} milestones)`)
}
