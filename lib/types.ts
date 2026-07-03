export interface EquityPoint {
  date: string
  ema: number
  orb: number
  combined: number
  dc?: number
  combined_pct?: number
}

export interface DayPnL {
  date: string
  pnl_pts: number
  pnl_usd: number
}

export interface PortfolioStats {
  pf: number
  sharpe: number
  max_dd_usd: number
  win_pct: number
  total_pts: number
  total_usd: number
  trade_days: number
}

export interface Position {
  strategy: string
  size: string
  entry_date: string
  entry_px: number
  current_px: number
  pnl_pts: number
  pnl_usd: number
  direction: string
}

export interface NetReturns {
  "5d_pts": number
  "5d_usd": number
  "5d_pct": number
  ytd_pts: number
  ytd_usd: number
  ytd_pct: number
}

export interface StrategyParams {
  [key: string]: string
}

export interface Strategy {
  name: string
  status: string
  in_portfolio: boolean
  combo_key: string
  description: string
  params: StrategyParams
}

export interface MonthlyPoint {
  month: string
  pnl: number
  equity: number
}

export interface StrategyPerfDetail {
  n_winners: number
  n_losers: number
  n_breakeven: number
  total_net_usd: number
  avg_win_usd: number
  avg_loss_usd: number
  largest_win_usd: number
  largest_loss_usd: number
  gross_profit_usd: number
  gross_loss_usd: number
  monthly: MonthlyPoint[]
}

export interface StrategyBacktestStats {
  expectancy_pts: number
  expectancy_usd: number
  max_dd_usd: number
  profit_factor: number
  n_trades: number
  win_pct: number
  sharpe: number
  sortino: number
  calmar: number
  cagr_pct: number
  monthly_mean_usd: number
  monthly_std_usd: number
  monthly_win_rate: number
  payoff_ratio: number
  max_consec_losses: number
}

export interface LiveTrade {
  strategy: string
  strategy_key: string
  direction: "Long" | "Short"
  entry_time_sgt: string
  entry_signal_ref: number
  entry_fill: number
  entry_slippage_pts: number
  exit_time_sgt: string
  exit_fill: number
  exit_type: "stop" | "eod" | "reverse" | "time"
  actual_pnl_pts: number | null
  actual_pnl_usd: number | null
  backtest_exp_pts: number
  backtest_exp_usd: number
  vs_expectancy_pts: number | null
  vs_expectancy_usd: number | null
  week: string
  trade_date: string
}

export interface LiveDayCurve {
  date: string
  day_pnl_pts: number
  day_pnl_usd: number
  cum_pts: number
  cum_usd: number
}

export interface LiveWeekSummary {
  week: string
  trades_count: number
  total_pnl_pts: number
  total_pnl_usd: number
}

export interface LiveTradesData {
  trades: LiveTrade[]
  weeks: LiveWeekSummary[]
  week_list: string[]
  daily_curve: LiveDayCurve[]
  summary: {
    total_trades: number
    total_pnl_pts: number
    total_pnl_usd: number
    win_rate: number
    avg_slippage_pts: number
    live_since: string
  }
}

export interface ProjectionStrategy {
  name: string
  instrument: string
  direction: string
  status: string
  annual_usd: number
  total_usd: number
  sharpe: number
  max_dd_usd: number
  calmar: number
}

export interface ProjectionBook {
  annual_usd: number
  total_usd: number
  sharpe: number
  max_dd_usd: number
  calmar: number
  capital_estimate_usd: number
  return_on_capital_pct: number
  margin_usd?: number
  dd_buffer_usd?: number
}

export interface BookEquityPoint {
  date: string
  orb: number
  ema: number
  dc: number
  combined: number
}

export interface YtdEquity {
  as_of: string
  since: string
  through: string
  note: string
  series: BookEquityPoint[]
  end: Record<string, number>
}

export interface Strategy16y {
  win_rate: number
  avg_win_usd: number
  avg_loss_usd: number
  payoff_ratio: number
  profit_factor: number
  expectancy_usd: number
  sharpe: number
  sortino: number
  calmar: number
  recovery_factor: number
  max_dd_usd: number
  max_consec_losses: number
  concentration_top5_pct: number
  days_underwater: number
  n_trades: number
  total_usd: number
  monthly: MonthlyPoint[]
  basis?: string   // "daily" for the combined book block (per-trading-day stats)
}

export interface RiskBookStats {
  var95_usd: number
  var99_usd: number
  cvar95_usd: number
  cvar99_usd: number
  daily_vol_usd: number
  ann_vol_usd: number
  worst_day_usd: number
  best_day_usd: number
  max_dd_usd: number          // ungated 16y backtest
  gated_max_dd_usd: number    // deployed (live PF-gate) realized DD
  n_days: number
}

export interface RiskStrategy {
  name: string
  var95_usd: number
  cvar95_usd: number
  daily_vol_usd: number
  worst_day_usd: number
  max_dd_usd: number
  n_days: number
}

export interface DrawdownPoint {
  date: string      // YYYY-MM
  dd_usd: number    // ≤ 0 underwater in USD
  eq_usd: number    // cumulative equity in USD
}

export interface RiskBlock {
  gate: number
  basis: string
  min_reliable_n: number
  book: RiskBookStats
  drawdown_curve: DrawdownPoint[]
  per_strategy: RiskStrategy[]
  correlation_coactive: Record<string, Record<string, number | null>>
  coactive_n: Record<string, Record<string, number>>
}

export interface SizingGridEntry {
  o: number; e: number; d: number       // orb / ema / dc contracts
  dd: number                            // 16y modeled max drawdown ($, ungated worst-case)
  sh: number                            // Sharpe
  cal: number | null                    // Calmar
  ann: number                           // annual $
}
export interface Sizing {
  margins: { orb: number; ema: number; dc: number }   // $/contract (ORB/EMA intraday, DC overnight)
  risk_parity: { orb: number; ema: number; dc: number } // inverse-vol contract shares (sum≈1)
  max_contracts: number
  basis: string
  grid: SizingGridEntry[]
}

export interface Projections {
  as_of: string
  note: string
  n_strategies: number
  per_strategy: ProjectionStrategy[]
  book: ProjectionBook
  correlation: Record<string, Record<string, number>>
  risk?: RiskBlock
  sizing?: Sizing
  ytd_equity?: YtdEquity
  strategy_16y?: Record<string, Strategy16y>
  strategy_ytd?: Record<string, Strategy16y>
  book_16y?: Strategy16y
  book_ytd?: Strategy16y
}

export interface RejectedIdea {
  idea: string
  reason: string
  pattern?: string
}

export interface RejectedGroup {
  category: string
  items: RejectedIdea[]
}

export interface ResearchDiscipline {
  as_of: string
  headline: string
  book: string[]
  research_spend_usd: number
  tested_rejected: RejectedIdea[]
  // richer structure for the Methodology page (optional for back-compat with old data)
  summary?: string
  spend_ledger?: { bars_usd: number; ticks_usd: number; total_usd: number; note: string }
  gates?: { name: string; rule: string }[]
  failure_patterns?: { name: string; desc: string }[]
  rejected_groups?: RejectedGroup[]
}

export interface InvestorVerdict {
  as_of: string
  would_invest: boolean
  stance: string
  verdict: string
  scorecard: { criterion: string; target: string; now: string; pass: boolean }[]
}

export interface DashboardData {
  generated_at: string
  bridge_mode: string
  live_since: string
  demo_since: string
  oos_equity_curve: EquityPoint[]
  benchmarks?: Benchmarks
  last_7_days: DayPnL[]
  portfolio_stats: PortfolioStats
  active_positions: Position[]
  net_returns: NetReturns
  strategies: Record<string, Strategy>
  combo_stats: Record<string, PortfolioStats>
  strategy_backtest_stats?: Record<string, StrategyBacktestStats>
  performance_detail?: Record<string, StrategyPerfDetail>
  live_trades?: LiveTradesData
  projections?: Projections
  research_discipline?: ResearchDiscipline
  investor_verdict?: InvestorVerdict
}

export interface BenchmarkPoint { date: string; book: number | null; bh_nq: number; tbill: number }
export interface Benchmarks {
  capital_base: number
  tbill_rate_pct: number
  curve: BenchmarkPoint[]
  summary: {
    book_usd: number; book_pct: number; book_maxdd_usd: number
    bh_usd: number; bh_pct: number; bh_maxdd_usd: number
    tbill_usd: number; alpha_vs_bh_usd: number
  }
}
