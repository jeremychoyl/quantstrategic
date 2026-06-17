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
}

export interface DashboardData {
  generated_at: string
  bridge_mode: string
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
}
