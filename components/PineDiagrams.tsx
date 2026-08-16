"use client"

/* Diagrams for the scripts that are actually on a chart.

   SCOPE. "Live" here means alert-backed or confirmed in use, NOT the notebook's
   "Live:" field — that field is unreliable: Delta Proxy and Layer 2 Swing both carry
   it inside sections headed DELETED, where it means "the working copy" rather than
   "currently running". The evidenced set is small on purpose:

     Gekko Data Feed v2    live alert 4793738735 — the bar feed the bridge reads
     GEKKO MIRROR 150826   four live alerts, notifications only
     GEKKO LEVELS          published and in use on the dashboard

   Inline SVG rather than exported PNGs: theme-aware, sharp at any size, no binary
   assets, and nothing has to be generated on the other machine and shipped across.
   Every colour is a token so both themes work; nothing is hardcoded white or black. */

const ACCENT = "#00d4aa", ACCENT2 = "#7c6af7", WARN = "#f59e0b", DOWN = "#ff4d6d"
const AQUA = "#38bdf8"

function Frame({ title, sub, kicker, children }: {
  title: string; sub: string; kicker: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3"
         style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: ACCENT2 }}>{kicker}</p>
        <h3 className="text-base font-black tracking-tight mt-0.5">{title}</h3>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text2)" }}>{sub}</p>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }

/* ── 1. the bar feed, and how unequally the legs depend on it ─────────────── */
function FeedDiagram() {
  const legs = [
    { y: 118, name: "ORB",  c: DOWN,   dep: "every bar",    note: "range · break · stop · EOD flat" },
    { y: 158, name: "EMA",  c: WARN,   dep: "intraday only", note: "seeded from Databento" },
    { y: 198, name: "DC",   c: AQUA,   dep: "one bar",      note: "the 15:55 exit read, with a fallback" },
  ]
  return (
    <svg viewBox="0 0 620 240" width="100%" style={{ minWidth: 560, height: "auto" }} role="img"
         aria-label="TradingView bar feed flowing into bars.jsonl and on to the three legs, which depend on it unequally">
      <text x="0" y="14" fontSize="11" fontWeight="700" fill="var(--text2)" style={mono}>TradingView 5m bar</text>
      <rect x="0" y="24" width="150" height="34" rx="6" fill="none" stroke={ACCENT2} />
      <text x="12" y="45" fontSize="11" fill={ACCENT2} style={mono}>Gekko Data Feed v2</text>

      <path d="M150 41 H210" stroke="var(--border)" strokeWidth="1.5" fill="none" markerEnd="url(#a)" />
      <text x="158" y="34" fontSize="9" fill="var(--muted)" style={mono}>alert</text>

      <rect x="210" y="24" width="120" height="34" rx="6" fill="none" stroke="var(--border)" />
      <text x="222" y="45" fontSize="10.5" fill="var(--text2)" style={mono}>webhook</text>

      <path d="M330 41 H390" stroke="var(--border)" strokeWidth="1.5" fill="none" markerEnd="url(#a)" />
      <rect x="390" y="24" width="120" height="34" rx="6" fill="none" stroke={ACCENT} />
      <text x="400" y="45" fontSize="10.5" fill={ACCENT} style={mono}>bars.jsonl</text>

      {/* the single point of dependency */}
      <path d="M450 58 V88" stroke="var(--border)" strokeWidth="1.5" fill="none" />
      <path d="M170 88 H450" stroke="var(--border)" strokeWidth="1.5" fill="none" />
      <text x="176" y="82" fontSize="9" fill="var(--muted)" style={mono}>every leg reads this file</text>

      {legs.map(l => (
        <g key={l.name}>
          <path d={`M170 88 V${l.y - 8} H210`} stroke={l.c} strokeWidth="1.5" fill="none" markerEnd="url(#a)" opacity="0.75" />
          <rect x="210" y={l.y - 24} width="72" height="32" rx="6" fill="none" stroke={l.c} />
          <text x="228" y={l.y - 3} fontSize="12" fontWeight="700" fill={l.c} style={mono}>{l.name}</text>
          <text x="296" y={l.y - 9} fontSize="10.5" fontWeight="700" fill={l.c} style={mono}>{l.dep}</text>
          <text x="296" y={l.y + 4} fontSize="9.5" fill="var(--muted)" style={mono}>{l.note}</text>
        </g>
      ))}

      <text x="0" y="232" fontSize="10" fill="var(--muted)" style={mono}>
        signals are computed locally — but a dropped bar still reaches ORB first
      </text>
      <defs>
        <marker id="a" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="var(--border)" />
        </marker>
      </defs>
    </svg>
  )
}

/* ── 2. the mirror: three gated blocks, output is drawing only ────────────── */
function MirrorDiagram() {
  const blocks = [
    { x: 0,   name: "ORB",  gate: "trend20 bias",  draws: "OR lines · ORB↑ ORB↓ SKIP", c: "var(--text)" },
    { x: 205, name: "EMA",  gate: "ATR33p gate",   draws: "EMA 9/100/200 · REV↑ REV↓", c: WARN },
    { x: 410, name: "DC",   gate: "10d Donchian",  draws: "DC10 low · DC↑ exit t-stop", c: AQUA },
  ]
  return (
    <svg viewBox="0 0 620 210" width="100%" style={{ minWidth: 560, height: "auto" }} role="img"
         aria-label="The mirror's three blocks, each with its own gate, all outputting chart drawings only">
      {blocks.map(b => (
        <g key={b.name}>
          <rect x={b.x} y="10" width="190" height="30" rx="6" fill="none" stroke={b.c} opacity="0.5" />
          <text x={b.x + 12} y="30" fontSize="12" fontWeight="700" fill={b.c} style={mono}>{b.name}</text>
          <text x={b.x + 62} y="30" fontSize="10" fill="var(--muted)" style={mono}>{b.gate}</text>
          <path d={`M${b.x + 95} 40 V70`} stroke="var(--border)" strokeWidth="1.5" markerEnd="url(#b)" />
          <rect x={b.x} y="70" width="190" height="34" rx="6" fill="none" stroke="var(--border)" />
          <text x={b.x + 10} y="91" fontSize="9.5" fill="var(--text2)" style={mono}>{b.draws}</text>
          <path d={`M${b.x + 95} 104 V132`} stroke="var(--border)" strokeWidth="1.5" markerEnd="url(#b)" />
        </g>
      ))}

      <rect x="0" y="132" width="600" height="34" rx="6" fill="none" stroke={ACCENT} />
      <text x="16" y="153" fontSize="11" fontWeight="700" fill={ACCENT} style={mono}>
        chart markers + an 11-row status table
      </text>
      <text x="330" y="153" fontSize="10.5" fill={DOWN} style={mono}>places no orders — ever</text>

      <text x="0" y="190" fontSize="10" fill="var(--muted)" style={mono}>
        the ATR gate sits in the EMA block because EMA is its only consumer
      </text>
      <text x="0" y="204" fontSize="10" fill="var(--muted)" style={mono}>
        exit rows never reset · skipped ≠ traded · the bias pair gates ORB alone
      </text>
      <defs>
        <marker id="b" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="var(--border)" />
        </marker>
      </defs>
    </svg>
  )
}

/* ── 3. levels: what it draws, and where they sit ─────────────────────────── */
function LevelsDiagram() {
  const lines = [
    { y: 26,  label: "PDH",     c: ACCENT2, note: "prior RTH high — not the daily bar" },
    { y: 54,  label: "ONH",     c: "var(--text2)", note: "overnight Globex high" },
    { y: 86,  label: "SMA20",   c: WARN, dash: "5 4", note: "the bias pair — together these gate ORB" },
    { y: 104, label: "D CLOSE", c: WARN, note: "" },
    { y: 136, label: "RTH open", c: ACCENT, dash: "2 3", note: "09:30 cash open" },
    { y: 166, label: "ONL",     c: "var(--text2)", note: "overnight Globex low" },
    { y: 194, label: "PDL",     c: ACCENT2, note: "prior RTH low" },
  ]
  return (
    <svg viewBox="0 0 620 230" width="100%" style={{ minWidth: 560, height: "auto" }} role="img"
         aria-label="The session levels GEKKO LEVELS draws, arranged by price">
      {lines.map(l => (
        <g key={l.label}>
          <line x1="86" y1={l.y} x2="400" y2={l.y} stroke={l.c} strokeWidth="1.5"
                strokeDasharray={l.dash} opacity="0.9" />
          <text x="80" y={l.y + 4} fontSize="10.5" fontWeight="700" fill={l.c} textAnchor="end" style={mono}>
            {l.label}
          </text>
          {l.note && <text x="410" y={l.y + 4} fontSize="9.5" fill="var(--muted)" style={mono}>{l.note}</text>}
        </g>
      ))}
      {/* bias pair bracket */}
      <path d="M404 86 h8 v18 h-8" stroke={WARN} fill="none" strokeWidth="1.2" opacity="0.7" />
      <text x="0" y="222" fontSize="10" fill="var(--muted)" style={mono}>
        only the levels in play are drawn — the rest are suppressed rather than clutter the chart
      </text>
    </svg>
  )
}

export default function PineDiagrams() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-black tracking-tight">What the live scripts do</h2>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          The three that are actually on a chart. &quot;Live&quot; here means alert-backed or confirmed in
          use — not the strategy log&apos;s <span className="font-mono">Live:</span> field, which also
          appears on scripts that were deleted months ago.
        </p>
      </div>

      <Frame kicker="indicator · feeds the bridge" title="Gekko Data Feed v2"
             sub="The one script with a live role in trading. It pushes every confirmed 5-minute bar to the Mac mini. Signals are computed locally now, but the bars are not — and the three legs depend on them very unequally.">
        <FeedDiagram />
      </Frame>

      <Frame kicker="indicator · display only" title="GEKKO MIRROR 150826"
             sub="Draws what the bridge is doing so demo trades can be checked against the chart. Three blocks, each with its own gate, all output drawings."
      >
        <MirrorDiagram />
      </Frame>

      <Frame kicker="indicator · reference" title="GEKKO LEVELS"
             sub="The session levels worth watching, drawn only when they are in play. PDH/PDL are built from RTH alone — the CME daily bar includes Globex, so its 'prior day high' is usually just the overnight high, a different price from the one an opening-range break tests.">
        <LevelsDiagram />
      </Frame>
    </div>
  )
}
