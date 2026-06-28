export interface EquityPoint {
  date: string
  ema: number
  orb: number
  overnight: number
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

export interface Projections {
  as_of: string
  note: string
  n_strategies: number
  per_strategy: ProjectionStrategy[]
  book: ProjectionBook
  correlation: Record<string, Record<string, number>>
  ytd_equity?: YtdEquity
  strategy_16y?: Record<string, Strategy16y>
  strategy_ytd?: Record<string, Strategy16y>
  book_16y?: Strategy16y
  book_ytd?: Strategy16y
}

export interface ResearchDiscipline {
  as_of: string
  headline: string
  book: string[]
  research_spend_usd: number
  tested_rejected: { idea: string; reason: string }[]
}

export interface DashboardData {
  generated_at: string
  bridge_mode: string
  live_since: string
  demo_since: string
  oos_equity_curve: EquityPoint[]
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
}
