// TradingView tab content.
//
// This is the BAKED-IN DEFAULT. The page renders from it unconditionally, so the
// tab is never blank and never depends on a network fetch.
//
// It is also the SEED for the live channel: `/api/tradingview` looks for
// `tradingview.json` in the quantstrategic-data repo and, if present, that
// payload OVERRIDES everything here. That is how the Windows PC publishes an
// update without a redeploy — see scripts/tradingview.seed.json and the
// "How this page updates" card on the tab.
//
// Sources for the takeaways below (all in the private jeremychoyl/PineScripts
// repo): CLAUDE.md "Execution Pipeline" (verified against bridge source
// 2026-08-16), notebook.md per-strategy log, dax_backtest_results_20260814.md.

export type TvLink = {
  title: string
  href: string
  blurb: string
  meta?: string
}

export type TvTakeaway = {
  headline: string
  detail: string
  evidence?: string
}

export type TvGroup = {
  title: string
  sub: string
  items: TvTakeaway[]
}

export type TvNotes = {
  updated: string        // ISO date of the underlying work, not of the fetch
  source: string         // where the canonical copy lives
  links: TvLink[]
  groups: TvGroup[]
}

export const TV_NOTES: TvNotes = {
  updated: "2026-08-16",
  source: "jeremychoyl/PineScripts",

  links: [
    {
      title: "GEKKO LEVELS",
      href: "/tv/gekko-levels.html",
      meta: "indicator · reference",
      blurb:
        "Session reference levels — PDH/PDL built from RTH only (deliberately not the daily bar, which includes Globex), the D CLOSE/SMA20 bias pair that gates ORB, the overnight Globex range, and the session opens. Only the levels actually in play are drawn.",
    },
    {
      title: "GEKKO MIRROR 150826",
      href: "/tv/gekko-mirror.html",
      meta: "indicator · reference",
      blurb:
        "Chart mirror of the three bridge strategies. Every row of the status table, the six alerts and their plot slots, and the three readings that mislead if you do not know them.",
    },
  ],

  groups: [
    {
      title: "Where TradingView actually sits in the live stack",
      sub: "Re-verified against bridge.py source on 2026-08-16, not from memory",
      items: [
        {
          headline: "Signals are fully local. TradingView no longer decides a trade.",
          detail:
            "Since the Pickmytrades path was retired on 2026-07-01, bridge.py computes all three legs on the Mac mini and sends orders to Tradovate direct. No leg takes an alert as a trade signal: ORB runs in-process from bars, EMA reads ema_signal_rth.json, DC reads dc_signal.json built purely from the Databento parquet.",
          evidence: "The old Pine EMA webhook path still exists in webhook_receiver.py but nothing reads it — dead code, last written 2026-07-28.",
        },
        {
          headline: "But the bar FEED is still TradingView, and ORB depends on it completely.",
          detail:
            "bars.jsonl is written from the Gekko Data Feed v2 alert. ORB reads it for the opening range, the break, the stop and the EOD flat — a dropped bar kills the range. EMA is partly dependent (the intraday continuation), DC only on the exit side.",
          evidence: "4 of 23 sessions ran an incomplete opening range (~8%). The 2026-07-27 cut-over removed the ALERT dependency; it did not remove the BAR-STREAM one.",
        },
        {
          headline: "A missing ORB alert is expected, not a fault.",
          detail:
            "MNQ ORB [Tradovate] has no live alert because ORB moved inside bridge.py. A stale note describing the old webhook path caused exactly that misdiagnosis once — a missing alert read as a broken strategy.",
          evidence: "Restoring those alerts would post old-format JSON, with the old token, to a service no longer in use.",
        },
        {
          headline: "The mirror was forked, not edited.",
          detail:
            "GEKKO MIRROR 150826 replaces the original, which sat on a do-not-touch 8-panel trading screen. Diffed line by line: signal logic is byte-identical, every difference is display. Its EMA webhook alert is redundant since the local cut-over and is safe to delete.",
        },
      ],
    },

    {
      title: "Method lessons — the ones that cost time",
      sub: "Each of these produced a wrong verdict before it was found",
      items: [
        {
          headline: "Deep backtest or no verdict. Short windows invert the answer.",
          detail:
            "Regime Delta Scalper read +$1,397 / PF 1.078 on a four-month window and −$7,543 / PF 0.97 over 7.2 years and 8,009 trades. DAX ORB inverted the same way: +34% over full history, −7% on the recent four months.",
          evidence: "Any assessment must run Deep Backtesting over full history. The flattering window was a strongly up-trending market, and even it underperformed buy-and-hold.",
        },
        {
          headline: "margin_long / margin_short is a PERCENTAGE of notional, not dollars.",
          detail:
            "TradingView's 100% default meant one MNQ contract needed $57,800 against $25,000 of capital, so every order was silently rejected — Strategy Tester showed zero trades with no error and no compile warning. Use ~2.6% for Tradovate intraday.",
          evidence: "First misdiagnosed as a footprint-history limit. It was not.",
        },
        {
          headline: "request.footprint() DOES work in a Pine v6 strategy, history included.",
          detail:
            "The long-standing project rule saying otherwise — and telling you to fall back to synthetic delta for strategies — was simply outdated.",
          evidence: "8,009 backtested trades with correct buy/sell volumes disprove it.",
        },
        {
          headline: "Strategy alerts snapshot the code at creation.",
          detail:
            "Edit a script and the existing alert keeps firing the old logic. The alert has to be deleted and recreated after every edit, or live trading silently runs a version you no longer have on screen.",
        },
      ],
    },

    {
      title: "What was tested, and what it returned",
      sub: "Verdicts, including the ones that are deliberately not verdicts",
      items: [
        {
          headline: "The EMA 24-hour basis defect was real, and it was fixed in Pine too.",
          detail:
            "Both the mirror and the GEKKO EMA strategy now compute EMA9/100/200 on RTH bars only, via a manual recursive EMA that advances solely inside the session. Gating entries to RTH is not enough — a 24-hour EMA manufactures phantom crosses at the open from overnight moves.",
          evidence: "24h basis PF 1.02 versus the RTH backtest's 1.43. The strategy's session default was flipped from 24hr to RTH Only on the same finding.",
        },
        {
          headline: "Absorption Reversal is un-testable, which is not the same as edgeless.",
          detail:
            "Attacked three ways and every one dead-ends on sample size rather than on the strategy. All three agree on direction (positive) and on rarity (~0.15–0.25 trades a day); none has the sample to prove an edge. It runs observe-only, on plain-text alerts that physically cannot reach the bridge.",
          evidence: "TradingView serves ~3.5 months of 1-min intrabars; fp.delta coarsens back in history; the only clean-delta export was 4.4 days. The Mac mini has been storing true footprint delta since May 2026 — judge it at ≥30 confirmed-flip trades.",
        },
        {
          headline: "The Markov model over true delta has no edge at current n — and the test was underpowered.",
          detail:
            "Base and all three variants failed the friction bar. The deeper finding was structural: transition-matrix rows are nearly uniform, so the next state is roughly independent of the current one and the one-bar Markov property is weak on these states.",
          evidence: "Max train |t| 1.80. Detecting a true 1.1-point edge at t=2 needs ~1,100 bars per state; the largest states had ~520.",
        },
        {
          headline: "DAX is marginal, not an edge.",
          detail:
            "The cash-open ORB anchor clears PF 1.045 over full history, but its maximum drawdown of 35.67% exceeds the 34.01% total return — a poor return-to-pain profile whatever the profit factor says. The US-open anchor loses outright at PF 0.98 despite a higher win rate, because the wider opening range widens the stop without widening the edge.",
          evidence: "PF 1.045 sits in the same grey band as Delta Proxy v3.0 (1.055, called viable) and Regime Delta Scalper (0.97, rejected).",
        },
      ],
    },
  ],
}
