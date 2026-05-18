export type AssetType = 'stock_br' | 'stock_us' | 'fii' | 'etf' | 'bdr';

export type OperationType = 'buy' | 'sell';

export type AlertType =
  | 'price_target'
  | 'price_drop'
  | 'dividend'
  | 'com_date'
  | 'payment'
  | 'news'
  | 'ir'
  | 'gain'
  | 'loss';

export interface UserPreferences {
  defaultCurrency: 'BRL' | 'USD';
  notifyEmail: boolean;
  notifyApp: boolean;
  compactDashboard: boolean;
  showPatrimonyChart: boolean;
  defaultRiskProfile: 'conservative' | 'moderate' | 'aggressive';
  language: 'pt-BR';
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  financial_goal: FinancialGoal;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface SettingsPayload {
  isDemo: boolean;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  preferences: UserPreferences;
  memberSince?: string;
}

export interface FinancialGoal {
  targetAmount?: number;
  targetDate?: string;
  monthlyContribution?: number;
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  ticker: string;
  asset_type: AssetType;
  quantity: number;
  average_price: number;
  purchase_date: string;
  notes?: string;
  current_price?: number;
  current_value?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  dividend_yield?: number;
}

export interface Operation {
  id: string;
  user_id: string;
  ticker: string;
  operation_type: OperationType;
  quantity: number;
  price: number;
  total: number;
  fees: number;
  operation_date: string;
  market: 'B3' | 'NYSE' | 'NASDAQ';
}

export interface Dividend {
  id: string;
  user_id: string;
  ticker: string;
  amount: number;
  amount_per_share?: number;
  quantity?: number;
  com_date?: string;
  ex_date?: string;
  payment_date?: string;
  status: 'expected' | 'confirmed' | 'paid';
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  asset_type: AssetType;
  notes?: string;
  current_price?: number;
  change_percent?: number;
}

export interface Alert {
  id: string;
  user_id: string;
  ticker?: string;
  alert_type: AlertType;
  condition: Record<string, unknown>;
  is_active: boolean;
  notify_email: boolean;
  notify_app: boolean;
}

export interface TaxRecord {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_sales: number;
  profit_loss: number;
  tax_due: number;
  darf_amount: number;
  is_exempt: boolean;
  details: Record<string, unknown>;
}

export interface FinancialEvent {
  id: string;
  ticker: string;
  event_type: string;
  title: string;
  event_date: string;
  description?: string;
}

export interface Quote {
  ticker: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  pe?: number;
  dividendYield?: number;
  currency: 'BRL' | 'USD';
  source: string;
  updatedAt: string;
}

export interface CompanyFundamentals {
  ticker: string;
  name?: string;
  sector?: string;
  pe?: number;
  pb?: number;
  roe?: number;
  debtToEquity?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  dividendYield?: number;
  marketCap?: number;
  eps?: number;
  source: string;
}

export interface CompanyAnalysis {
  ticker: string;
  summary: string;
  valuation: string;
  debt: string;
  profit: string;
  growth: string;
  dividends: string;
  governance: string;
  trend: string;
  recommendation: 'buy' | 'hold' | 'sell' | 'neutral';
  /** Nota legada 0-100 (mantida para compatibilidade) */
  score: number;
  /** Nota de recomendação de compra 0 a 10 */
  buyScore: number;
  /** Texto da recomendação de compra em linguagem simples */
  buyRecommendation: string;
  buyRecommendationLabel?: 'compra_forte' | 'compra' | 'neutro' | 'cautela' | 'evitar';
  plainLanguage: string;
  /** Análise ampliada com dados de RI */
  riReport?: RIAnalysisReport;
}

export interface RIFinancialMetrics {
  price: number;
  marketCap?: number;
  pe?: number;
  pb?: number;
  roe?: number;
  eps?: number;
  dividendYield?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  debtToEquity?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  dividendsLast12m?: number;
  currency: 'BRL' | 'USD';
}

export interface DividendEventInfo {
  comDate?: string;
  exDate?: string;
  paymentDate?: string;
  amountPerShare?: number;
  label?: string;
}

export interface DividendCalendarInfo {
  nextComDate?: string;
  lastDividend?: DividendEventInfo;
  nextDividend?: DividendEventInfo;
  paymentFrequency: string;
  paymentsLast12Months: number;
  totalDividendsLast12m: number;
  dividendYieldLast12mPercent?: number;
}

export interface RIAnalysisReport {
  ticker: string;
  companyName: string;
  sector?: string;
  dataSource: string[];
  metrics: RIFinancialMetrics;
  dividendCalendar?: DividendCalendarInfo;
  /** Retorno real nos últimos 12 meses (preço + dividendos) */
  annualReturnPercent: number;
  annualPriceReturnPercent: number;
  annualDividendReturnPercent: number;
  /** Retorno projetado para os próximos 12 meses */
  projectedReturnPercent: number;
  projectedReturnExplanation: string;
  growthAnalysis: string;
  numbersAnalysis: string;
  priceHistory: { date: string; close: number }[];
  highlights: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
}

export interface DashboardStats {
  totalInvested: number;
  currentPatrimony: number;
  profitLoss: number;
  profitLossPercent: number;
  dividendsReceived: number;
  monthlyReturn: number;
  annualReturn: number;
  bestAssets: { ticker: string; return: number }[];
  worstAssets: { ticker: string; return: number }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export type OpportunityType =
  | 'discounted'
  | 'high_dividend'
  | 'growth'
  | 'trending'
  | 'forgotten';

export interface Opportunity {
  ticker: string;
  name?: string;
  type: OpportunityType;
  score: number;
  reason: string;
  metrics: Record<string, number | string>;
}

export interface PortfolioSummary {
  items: PortfolioItem[];
  totalInvested: number;
  currentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  allocation: { type: AssetType; value: number; percent: number }[];
}
