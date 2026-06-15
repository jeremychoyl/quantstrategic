export interface Milestone {
  week: string
  date: string
  title: string
  items: string[]
  category: "infra" | "research" | "execution" | "live"
}

export const MILESTONES: Milestone[] = [
  {
    week: "W2", date: "2025-10", category: "infra",
    title: "Full pipeline live",
    items: ["Pine footprint → FastAPI → classifier → Qwen 2.5 14B → Telegram briefs", "TradingView webhook receiver on Cloudflare tunnel", "Regime classifier: 4-layer scorer (HTF/VA/VWAP/CVD)"],
  },
  {
    week: "W3", date: "2025-10", category: "infra",
    title: "Permanent infrastructure",
    items: ["gordongekko.uk domain on Cloudflare Registrar", "Watchdog dead-feed detector", "Telegram /brief command bot via launchd"],
  },
  {
    week: "W4–W8", date: "2025-11", category: "infra",
    title: "Regime monitor upgrades",
    items: ["VWAP layer: continuous ATR-distance scoring", "Key levels in /status (POC/VAH/VAL/VWAPs/4H swings)", "/levels, /delta, /session commands", "30-day log rotation in webhook receiver"],
  },
  {
    week: "W11–W16", date: "2025-11", category: "infra",
    title: "History & sparklines",
    items: ["regime_history.jsonl — all classifier runs deduped by bar_time", "Score sparkline ▁▂▃▄▅▆▇█ in /status", "5-min regime classifier cron", "Score trend ±drift over 30m"],
  },
  {
    week: "W20–W29", date: "2025-12", category: "infra",
    title: "Alert system build-out",
    items: ["17 alert types: regime change, proximity, VWAP cross, CVD div, sess extreme, score velocity, VA cross, vol spike, signal cluster, range ext…", "/perf, /history, /trend, /day, /compare, /watch, /edge, /matrix, /flow commands", "Alert log (alerts_log.jsonl) + /alertlog"],
  },
  {
    week: "W30–W39", date: "2026-01", category: "infra",
    title: "Advanced signal layer",
    items: ["Session open/close alerts with VWAP carry", "CVD divergence, VWAP cross, run extension alerts", "/setup, /context, /bias, /summary, /dist commands", "Signal cluster alert (🔥 3+ signals in 20m)", "Score vs price divergence detection"],
  },
  {
    week: "W40–W48", date: "2026-02", category: "infra",
    title: "Session intelligence",
    items: ["Range compression alert (🔲 coiling)", "POC migration tracking (📍)", "/vibe rule-based synthesis", "/scalp, /or, /overnight, /heatmap commands", "Auto-brief on significant regime change"],
  },
  {
    week: "W49", date: "2026-03", category: "research",
    title: "/dt and /st trade commands",
    items: ["Day trade setup command with Markov-gated entry/stop/target/RR", "Swing trade command with multi-session context", "Trade implications injected into session digest"],
  },
  {
    week: "W50", date: "2026-03", category: "research",
    title: "Markov layer + Claude narration",
    items: ["narrator.py: Claude Haiku primary, Ollama Qwen fallback", "markov_regime.py: state-transition probabilities, MFE/MAE targets", "/gekko command: full Markov-aware regime brief", "18 unit tests"],
  },
  {
    week: "W51", date: "2026-04", category: "research",
    title: "Unified narrator payload",
    items: ["Classifier data (regime/score/layers) injected into narration", "24h true-delta trend (avoids CVD reset problem)", "Markov gate on /dt and /st alerts (min 0.35 prob)", "PUSH_ALERTS frozenset — suppresses noise, only dt/st/session/watch on"],
  },
  {
    week: "W52–W53", date: "2026-04", category: "research",
    title: "HVN levels + Budfox debrief",
    items: ["hvn_tracker.py: PD/ON/OR POC/VAH/VAL/High/Low → /hvn command", "budfox.py: Claude Haiku session debrief — absorption, continuation, POC magnet, delta divergence", "bridge_push.py: hourly RTH push with key levels", "EMA cross added to PineScript mirror (ATR33p gate, reversal markers)"],
  },
  {
    week: "W54–W56", date: "2026-05", category: "research",
    title: "Research validation",
    items: ["fill_audit.py: demo slippage vs backtest expectations", "/risk: Kelly sizing + bootstrap risk profile", "vwap_stretch strategy REJECTED (no edge after costs)", "EMA hard stop analysis: VERDICT no stop (1.5×ATR marginal, DD worse)", "Worst-day risk −$2,578 accepted knowingly"],
  },
  {
    week: "W57", date: "2026-06-14", category: "execution",
    title: "Live execution infrastructure",
    items: ["BRIDGE_MODE env var: shadow → demo → live", "tradovate_live.py: live API twin (live.tradovateapi.com)", "Kill switch: −500 pts/day → no new entries", "golive_push.py: automated June 27 go/no-go verdict", "sizing_rule(): 1→2 MNQ scaling criteria"],
  },
  {
    week: "W58", date: "2026-06-14", category: "execution",
    title: "Demo execution polish",
    items: ["Per-env Tradovate token files (demo vs live)", "MODE_BADGE (🎯 DEMO / 🚨 LIVE) in all account commands", "/flatten emergency exit (orb/ema/all)", "Demo P&L block in hourly bridge push (today/week/all-time)"],
  },
  {
    week: "W59", date: "2026-06-14", category: "execution",
    title: "Bridge hardening",
    items: ["Stale position purge: clears positions ≥2 days old (intraday strategies)", "/demo execution dashboard: per-strategy fills, slippage trend, P&L by day", "/preflight: 7-section live-readiness check (criteria, OOS, auth, equity, state, kill switch, mode)"],
  },
  {
    week: "W60", date: "2026-06-14", category: "execution",
    title: "2026 OOS validation",
    items: ["2026 OOS regression: GREEN (EMA PF 1.53, ORB PF 2.02)", "Simultaneous margin guard REMOVED — creates backtest divergence", "Demo milestone alert at 5th completed trade", "/oos command, /preflight section 2"],
  },
  {
    week: "W61", date: "2026-06-15", category: "execution",
    title: "Go-live automation",
    items: ["CONDITIONAL GO LIVE path: ≥3 trades, no FAILs, PF>1.0", "Quarterly OOS breakdown: Q1 ORB 1.97 / Q2 ORB 2.06 (not front-loaded)", "week1_push.py: June 20 checkpoint", "July 7 follow-up audit cron"],
  },
  {
    week: "W62", date: "2026-06-15", category: "live",
    title: "Live readiness",
    items: ["/bridgestatus: mode, feed age, last 10 signals, daily counts", "go_live_switch.py: reads verdict → patches BRIDGE_MODE=live → verifies auth", "week2_push.py: June 23 final pulse with early verdict prediction", "QuantStrategic dashboard initiated"],
  },
]
