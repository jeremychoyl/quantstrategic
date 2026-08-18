#!/usr/bin/env node
// Sweeps every route at phone and desktop widths and fails if anything overflows
// the viewport horizontally. Optionally writes a screenshot per route.
//
// WHY: the dashboard was desktop-first for months without anyone noticing how bad
// it was on a phone, because there was no cheap way to LOOK. The obvious way is
// also a trap:
//
//   ⚠️  `chrome --headless --screenshot --window-size=390,844` DOES NOT render a
//       390px layout. macOS clamps the Chrome window to a ~500px minimum, so the
//       page is laid out at 500px and then CROPPED to 390. The output looks like
//       catastrophic overflow that isn't real, and you go debugging your CSS
//       instead of your harness. (Probe it: a page printing window.innerWidth
//       reports 500 for a --window-size=390 run.)
//
// The only honest way is CDP's Emulation.setDeviceMetricsOverride, which is what
// this does. Node's global WebSocket means no puppeteer/ws dependency.
//
// A screenshot alone is also a weak check — it is slow to read and easy to
// misjudge. The real signal is the programmatic audit: walk every element and
// flag any whose box escapes the viewport. Note it deliberately does NOT test
// document.scrollWidth, because `body { overflow-x: hidden }` in globals.css
// hides the symptom while leaving the bug; the elements have to be scanned.
//
// Usage:
//   npm run build && npx next start -p 3111     # in another terminal
//   npm run check:responsive                    # sweep all routes, 390 + 1280
//   npm run check:responsive -- --shots ./shots # also write screenshots
//   npm run check:responsive -- --widths 390    # phone only
//   npm run check:responsive -- --routes /,/risk
//   npm run check:responsive -- --selftest --routes /   # prove the audit can fail
//
// Env: CHROME       path to the Chrome binary (default: macOS install location)
//      BASE_URL     server to test (default: http://localhost:3111)

import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(HERE, "..", "app")

const CHROME = process.env.CHROME
  || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const BASE = (process.env.BASE_URL || "http://localhost:3111").replace(/\/$/, "")
const PORT = 9222

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const WIDTHS = arg("widths", "390,1280").split(",").map(Number)
const SHOTS = arg("shots", null)
const SELFTEST = process.argv.includes("--selftest")
const sleep = ms => new Promise(r => setTimeout(r, ms))

// A CDP call against a page that has stopped responding (server died mid-sweep,
// say) never settles, and the whole run hangs on a top-level await with nothing
// printed to say why. Every command gets a deadline instead.
const withTimeout = (p, ms, what) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms}ms: ${what}`)), ms)),
])

// Routes are DISCOVERED, not listed, so a new page is covered the day it lands
// rather than the day someone remembers to add it here.
function discoverRoutes() {
  const explicit = arg("routes", null)
  if (explicit) return explicit.split(",")
  const routes = existsSync(join(APP_DIR, "page.tsx")) ? ["/"] : []
  for (const e of readdirSync(APP_DIR, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "api") continue
    if (e.name.startsWith("_") || e.name.startsWith("(")) continue
    if (existsSync(join(APP_DIR, e.name, "page.tsx"))) routes.push(`/${e.name}`)
  }
  return routes
}

// Report the OUTERMOST offender only — every child of an overflowing box also
// overflows, and a hundred rows of the same bug is not a hundred bugs. Anything
// inside a container that is SUPPOSED to scroll sideways is skipped.
//
// Walks the tree explicitly rather than with querySelectorAll, so that SVG
// INTERIORS can be skipped: recharts renders thousands of nodes per chart and
// measuring each one blew past the timeout. The <svg> itself is still measured —
// chart internals cannot overflow independently of it.
//
// ⚠️ Do NOT "simplify" this to `querySelectorAll('body *:not(svg *)')`. A
// descendant combinator inside :not() is pathological on a DOM this size and
// took the whole BROWSER down mid-sweep, not just the page.
const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth
  const bad = []
  const stack = [document.body]
  while (stack.length) {
    const el = stack.pop()
    if (el.tagName !== 'svg') for (const ch of el.children) stack.push(ch)
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.right <= vw + 1 && r.left >= -1) continue
    let p = el.parentElement, inScroll = false
    while (p) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll') { inScroll = true; break }
      p = p.parentElement
    }
    if (inScroll) continue
    if (bad.some(b => b.el.contains(el))) continue
    bad.push({ el, tag: el.tagName, cls: String(el.className || '').slice(0, 90),
               left: Math.round(r.left), right: Math.round(r.right) })
  }
  return JSON.stringify({ vw, count: bad.length,
    bad: bad.slice(0, 10).map(({ tag, cls, left, right }) => ({ tag, cls, left, right })) })
})()`

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map() }
  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
    const c = new CDP(ws)
    ws.onmessage = e => {
      const m = JSON.parse(e.data)
      const p = m.id && c.pending.get(m.id)
      if (!p) return
      c.pending.delete(m.id)
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result)
    }
    return c
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
}

async function main() {
  const res = await fetch(BASE, { method: "HEAD" }).catch(() => null)
  if (!res) {
    console.error(`✗ nothing serving at ${BASE}\n  start it:  npm run build && npx next start -p 3111`)
    process.exit(2)
  }
  if (SHOTS) mkdirSync(SHOTS, { recursive: true })

  const profile = mkdtempSync(join(tmpdir(), "resp-check-"))
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" })

  let ready = false
  for (let i = 0; i < 30 && !ready; i++) {
    await sleep(400)
    ready = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(() => true).catch(() => false)
  }
  if (!ready) { chrome.kill(); console.error("✗ Chrome did not expose a debugging port"); process.exit(2) }

  const routes = discoverRoutes()
  let failures = 0
  let browserDead = false

  try {
    for (const width of WIDTHS) {
      if (browserDead) break
      const phone = width < 640
      console.log(`\n── ${width}px ${phone ? "(phone)" : "(desktop)"} ──`)
      for (const route of routes) {
        // If Chrome itself has gone, say so once and stop — otherwise every
        // remaining route reports an identical connection error.
        let t, c
        try {
          t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json()
          c = await CDP.connect(t.webSocketDebuggerUrl)
        } catch {
          console.error(`\n✗ the browser died mid-sweep (last route: ${route})`)
          failures++
          browserDead = true
          break
        }
        try {
          await withTimeout(c.send("Page.enable"), 15000, "Page.enable")
          await withTimeout(c.send("Emulation.setDeviceMetricsOverride", {
            width, height: 900, deviceScaleFactor: 2, mobile: phone,
          }), 15000, "setDeviceMetricsOverride")
          await withTimeout(c.send("Page.navigate", { url: BASE + route }), 30000, `navigate ${route}`)
          await sleep(6000) // client-side fetch + recharts render

          // Positive control. A checker that cannot fail is worth nothing, and
          // the audit is easy to break silently while it keeps printing ✓ — so
          // --selftest plants an element that MUST be caught.
          if (SELFTEST) {
            await c.send("Runtime.evaluate", { expression:
              `document.body.insertAdjacentHTML('beforeend',` +
              `'<div id="__probe" style="width:3000px;height:20px"></div>')` })
          }

          const out = await withTimeout(
            c.send("Runtime.evaluate", { expression: AUDIT, returnByValue: true }), 20000, `audit ${route}`)
          const { count, bad } = JSON.parse(out.result.value)

          if (SHOTS) {
            const shot = await withTimeout(
              c.send("Page.captureScreenshot", { format: "png" }), 20000, `screenshot ${route}`)
            const name = (route === "/" ? "home" : route.slice(1).replace(/\//g, "-"))
            writeFileSync(join(SHOTS, `${width}-${name}.png`), Buffer.from(shot.data, "base64"))
          }

          if (SELFTEST) {
            const caught = count > 0
            console.log(`  ${caught ? "✓" : "✗"} ${route.padEnd(16)} probe ${caught ? "caught" : "MISSED — the audit is blind"}`)
            if (!caught) failures++
          } else {
            console.log(`  ${count === 0 ? "✓" : "✗"} ${route.padEnd(16)} ${count} overflowing`)
            if (count > 0) {
              failures += count
              for (const b of bad) console.log(`      <${b.tag}> ${b.left}→${b.right}  ${b.cls}`)
            }
          }
        } catch (err) {
          // An unreachable route is a failed check, not a reason to abandon the
          // sweep — the other routes still have something to say.
          failures++
          console.log(`  ✗ ${route.padEnd(16)} ${err.message}`)
        } finally {
          // Both matter: a timed-out send leaves its promise pending, and an open
          // WebSocket keeps the event loop alive — so without the close() the run
          // hung after reporting a timeout instead of moving to the next route.
          await withTimeout(c.send("Target.closeTarget", { targetId: t.id }), 10000, "closeTarget")
            .catch(() => {})
          try { c.ws.close() } catch { /* already gone */ }
        }
      }
    }
  } finally {
    // Chrome keeps writing to the profile for a moment after SIGTERM, so deleting
    // it immediately threw ENOTEMPTY — which surfaced as a crash AFTER a clean
    // sweep and clobbered the exit code. Wait for the process, then treat the
    // temp-dir removal as best-effort: it must never decide the verdict.
    chrome.kill()
    await new Promise(done => {
      chrome.once("exit", done)
      setTimeout(done, 3000)
    })
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch { /* a stray temp dir is not a test failure */ }
  }

  if (SELFTEST) {
    console.log(failures === 0
      ? `\n✓ selftest passed — the audit detects a planted 3000px element`
      : `\n✗ selftest FAILED on ${failures} route(s) — the audit is not detecting overflow`)
  } else {
    console.log(failures === 0
      ? `\n✓ no horizontal overflow — ${routes.length} routes × ${WIDTHS.length} widths`
      : `\n✗ ${failures} overflowing element(s)`)
  }
  process.exit(failures === 0 ? 0 : 1)
}

await main()
