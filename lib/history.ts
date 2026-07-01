// GENERATED FILE — DO NOT EDIT.
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
  {
    week: "W2", date: "2026-05-27", category: "infra",
    title: "Full pipeline live",
    items: ["Pine footprint → FastAPI → classifier → Qwen 2.5 14B → Telegram briefs","TradingView webhook receiver on Cloudflare tunnel","Regime classifier: 4-layer scorer (HTF/VA/VWAP/CVD)"],
  },
  {
    week: "W3", date: "2026-05-28", category: "infra",
    title: "Permanent infrastructure",
    items: ["gordongekko.uk domain on Cloudflare Registrar","Watchdog dead-feed detector","Telegram /brief command bot via launchd"],
  },
  {
    week: "W4–W8", date: "2026-05-28", category: "infra",
    title: "Regime monitor upgrades",
    items: ["VWAP layer: continuous ATR-distance scoring","Key levels in /status (POC/VAH/VAL/VWAPs/4H swings)","/levels, /delta, /session commands","30-day log rotation in webhook receiver"],
  },
  {
    week: "W11–W16", date: "2026-05-28", category: "infra",
    title: "History & sparklines",
    items: ["regime_history.jsonl — all classifier runs deduped by bar_time","Score sparkline ▁▂▃▄▅▆▇█ in /status","5-min regime classifier cron","Score trend ±drift over 30m"],
  },
  {
    week: "W20–W29", date: "2026-06-02", category: "infra",
    title: "Alert system build-out",
    items: ["17 alert types: regime change, proximity, VWAP cross, CVD div, sess extreme, score velocity, VA cross, vol spike, signal cluster, range ext…","/perf, /history, /trend, /day, /compare, /watch, /edge, /matrix, /flow commands","Alert log (alerts_log.jsonl) + /alertlog"],
  },
  {
    week: "W30–W39", date: "2026-06-02", category: "infra",
    title: "Advanced signal layer",
    items: ["Session open/close alerts with VWAP carry","CVD divergence, VWAP cross, run extension alerts","/setup, /context, /bias, /summary, /dist commands","Signal cluster alert (🔥 3+ signals in 20m)","Score vs price divergence detection"],
  },
  {
    week: "W40–W48", date: "2026-06-03", category: "infra",
    title: "Session intelligence",
    items: ["Range compression alert (🔲 coiling)","POC migration tracking (📍)","/vibe rule-based synthesis","/scalp, /or, /overnight, /heatmap commands","Auto-brief on significant regime change"],
  },
  {
    week: "W49", date: "2026-06-03", category: "research",
    title: "/dt and /st trade commands",
    items: ["Day trade setup command with Markov-gated entry/stop/target/RR","Swing trade command with multi-session context","Trade implications injected into session digest"],
  },
  {
    week: "W50", date: "2026-06-10", category: "research",
    title: "Markov layer + Claude narration",
    items: ["narrator.py: Claude Haiku primary, Ollama Qwen fallback","markov_regime.py: state-transition probabilities, MFE/MAE targets","/gekko command: full Markov-aware regime brief","18 unit tests"],
  },
  {
    week: "W51", date: "2026-06-10", category: "research",
    title: "Unified narrator payload",
    items: ["Classifier data (regime/score/layers) injected into narration","24h true-delta trend (avoids CVD reset problem)","Markov gate on /dt and /st alerts (min 0.35 prob)","PUSH_ALERTS frozenset — suppresses noise, only dt/st/session/watch on"],
  },
  {
    week: "W52–W53", date: "2026-06-14", category: "research",
    title: "HVN levels + Budfox debrief",
    items: ["hvn_tracker.py: PD/ON/OR POC/VAH/VAL/High/Low → /hvn command","budfox.py: Claude Haiku session debrief — absorption, continuation, POC magnet, delta divergence","bridge_push.py: hourly RTH push with key levels","EMA cross added to PineScript mirror (ATR33p gate, reversal markers)"],
  },
  {
    week: "W54–W56", date: "2026-06-14", category: "research",
    title: "Research validation",
    items: ["fill_audit.py: demo slippage vs backtest expectations","/risk: Kelly sizing + bootstrap risk profile","vwap_stretch strategy REJECTED (no edge after costs)","EMA hard stop analysis: VERDICT no stop (1.5×ATR marginal, DD worse)","Worst-day risk −$2,578 accepted knowingly"],
  },
  {
    week: "W57", date: "2026-06-15", category: "execution",
    title: "Live execution infrastructure",
    items: ["BRIDGE_MODE env var: shadow → demo → live","tradovate_live.py: live API twin (live.tradovateapi.com)","Kill switch: −500 pts/day → no new entries","golive_push.py: automated June 27 go/no-go verdict","sizing_rule(): 1→2 MNQ scaling criteria"],
  },
  {
    week: "W58", date: "2026-06-15", category: "execution",
    title: "Demo execution polish",
    items: ["Per-env Tradovate token files (demo vs live)","MODE_BADGE (🎯 DEMO / 🚨 LIVE) in all account commands","/flatten emergency exit (orb/ema/all)","Demo P&L block in hourly bridge push (today/week/all-time)"],
  },
  {
    week: "W59", date: "2026-06-15", category: "execution",
    title: "Bridge hardening",
    items: ["Stale position purge: clears positions ≥2 days old (intraday strategies)","/demo execution dashboard: per-strategy fills, slippage trend, P&L by day","/preflight: 7-section live-readiness check (criteria, OOS, auth, equity, state, kill switch, mode)"],
  },
  {
    week: "W60", date: "2026-06-15", category: "execution",
    title: "2026 OOS validation",
    items: ["2026 OOS regression: GREEN (EMA PF 1.53, ORB PF 2.02)","Simultaneous margin guard REMOVED — creates backtest divergence","Demo milestone alert at 5th completed trade","/oos command, /preflight section 2"],
  },
  {
    week: "W61", date: "2026-06-15", category: "execution",
    title: "Go-live automation",
    items: ["CONDITIONAL GO LIVE path: ≥3 trades, no FAILs, PF>1.0","Quarterly OOS breakdown: Q1 ORB 1.97 / Q2 ORB 2.06 (not front-loaded)","week1_push.py: June 20 checkpoint","July 7 follow-up audit cron"],
  },
  {
    week: "W62", date: "2026-06-15", category: "execution",
    title: "Live readiness",
    items: ["/bridgestatus: mode, feed age, last 10 signals, daily counts","go_live_switch.py: reads verdict → patches BRIDGE_MODE=live → verifies auth","week2_push.py: June 23 final pulse with early verdict prediction","QuantStrategic dashboard initiated"],
  },
  {
    week: "W63", date: "2026-06-15", category: "infra",
    title: "QuantStrategic dashboard live",
    items: ["Next.js 14 command centre deployed to Vercel → app.gordongekko.uk","7-combo strategy selector + contract scale-up","Gold star ratings on PF / Sharpe / MaxDD / Win%","Overnight strategy tested → shelved (PF 1.04, Calmar too low)","Equity curves + per-strategy stats from quantstrategic-data repo"],
  },
  {
    week: "W64", date: "2026-06-16", category: "research",
    title: "DC Mean Reversion — 3rd strategy",
    items: ["Donchian Channel daily mean reversion: close < prior 10-day low → long next open","Exit3: first daily close > signal-close; 5-day time stop","OOS walkforward (3y→1y, 14 years): PF 2.76, Sharpe 1.14, 0 sit-out years","Corr vs ORB +0.05, vs EMA −0.01 — genuinely uncorrelated diversifier","dc_signal.py nightly signal file; bridge dispatch + 9-day stale purge","Command centre + PineScript mirror updated to include DC"],
  },
  {
    week: "W65", date: "2026-06-23", category: "live",
    title: "🚀 Live trading begins",
    items: ["go_live_switch.py --force executed 2026-06-23 — 4 days ahead of the June 27 gate","BRIDGE_MODE=live on Tradovate live account 1950777","ORB + EMA + DC live together, 1 MNQ each","Real capital deployed; kill switch −500 pts/day armed"],
  },
  {
    week: "W65", date: "2026-06-23", category: "research",
    title: "Autonomous research pipeline",
    items: ["spec_router.py: Haiku classifies hypothesis → template + params, with instant arch vetoes","auto_backtest.py: parametric breakout / reversion / ma_cross engine (shared cost, era, WF gates)","research_loop.py: fetch → filter → hypothesis → backtest with no manual approval gates","verdicts.jsonl all-time tracker → dashboard research section","HYP-001…006 all FAIL/SKIP — no ML edge on OHLCV confirmed"],
  },
  {
    week: "W66", date: "2026-06-23", category: "infra",
    title: "Telegram Claude Q&A (/ask)",
    items: ["/ask upgraded to full Claude Haiku Q&A over live system state + general knowledge","Research commentary fallback for non-hypothesis pastes (150–250 word take)","Twitter/X URL detection → paste-text workflow (scraping fully blocked in 2026)","ask_log.jsonl + /askhistory — mobile conversations reviewable","Confirmed end-to-end from iPhone"],
  },
  {
    week: "W67", date: "2026-06-24", category: "live",
    title: "Dashboard 5-tab redesign + Day-1 live",
    items: ["5 tabs: Overview · Details · Expected · Configurator · History","Details: every live trade since Jun 23 with slippage + vs-expectancy columns","Expected: 16y backtest + live-vs-expected convergence card","Configurator: projected/live toggle on combo selector","Day-1 live (2026-06-23): −478.5 pts (−$957), within 21.5 pts of kill switch — correlation risk (both legs long)"],
  },
  {
    week: "W68", date: "2026-06-24", category: "research",
    title: "Research loop hardening",
    items: ["spec_router data_required list-crash fixed (coerce to str)","Silent Telegram HTTP failures now surfaced in cron log","Research cron timing clarified: 22:00 SGT weekdays (evening, not morning)","dashboard_push _live_trades_data(): parses bridge_log for live fills → Details/Configurator"],
  },
  {
    week: "W69", date: "2026-06-24", category: "research",
    title: "Holiday filter tested → rejected",
    items: ["126 short-session dates detected empirically from nq_1m bars","Holidays are a PROFITABLE regime: combined PF 1.99 (ORB 1.22, EMA 5.41)","Filtering them out removes +1,525 pts and worsens EMA drawdown","VERDICT: do not add — numbers over priors"],
  },
  {
    week: "W70", date: "2026-06-25", category: "research",
    title: "Research fetcher v2 + first live EMA trade",
    items: ["New sources: OpenAlex, Hudson & Thames, Ernie Chan, QuantConnect, ReSolve","Dropped broken sources (SSRN 403, NBER 404, Two Sigma, Winton)","47 items fetched / 11 passed / 5 hypotheses (all correctly SKIP)","Bridge cron → 1-minute cadence","First live EMA trade: −$792.50 (regime variance, within bounds)"],
  },
  {
    week: "W71", date: "2026-06-28", category: "research",
    title: "Risk gates hardened",
    items: ["Calmar gate added (≥0.50) — catches undeployable drawdown PF+WF+corr miss (killed Silver: Calmar 0.20)","Fill-robustness gate: survive 2× cost + next-bar-open exits (catches exit look-ahead)","Order-flow / delta: 16y NQ tick data bought ($1,264) → REJECTED, ~0 forward edge (priced-in)","Data-sourcing discipline codified: field-level history, stage spend behind cheap gates"],
  },
  {
    week: "W72", date: "2026-06-29", category: "research",
    title: "Signal-template frontier explored",
    items: ["7 concepts tested: price action, volume/market profile, footprint, supply/demand, market structure, volume","0/7 deployable on NQ — all edgeless, redundant, or WF-killed","Extended to commodities + FX + BTC/6J/ZN (9 instruments) → 0 deployable","Classic indicators (S/R/MA/VWAP/pivot/ATR) × 9 instruments → 0/9","Conclusion: ORB + EMA + DC IS the edge set; alpha frontier exhausted"],
  },
  {
    week: "W73", date: "2026-06-30", category: "research",
    title: "Alpha frontier exhausted + risk overlays",
    items: ["Calendar/seasonality swept (72 TOM+DOW configs) → 0/72; long edge real but redundant with EMA (corr +0.52–0.73)","US-Treasury rates carry killed for $0 on free FRED yields (no cross-sectional premium; era-fragile time-series)","EMA-short ORB-flat decorrelation rejected — gate annihilates the strategy (n=814 → 3)","Every cheaply-accessible lever now run to a verdict; next alpha needs a deliberate data buy + new thesis","/corr monitor caught ORB-EMA at +0.43 co-active (not the stale +0.05) — known standing concentration","Book-vs-tape risk overlay + /progress n=100 tracker deployed; hold at 1 contract, operate & accumulate"],
  },
]
