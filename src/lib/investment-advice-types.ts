import type { AggregatedPosition } from '@/lib/portfolio-aggregate';

export type OpportunitySituation =
  | 'descontada_dividendos'
  | 'alto_dividendo_seguro'
  | 'crescimento_rapido'
  | 'maior_dy_setor'
  | 'baixa_preco_medio'
  | 'caixa'
  | 'aguardar';

export const OPPORTUNITY_SITUATION_LABELS: Record<OpportunitySituation, string> = {
  descontada_dividendos: 'Descontada + boa pagadora',
  alto_dividendo_seguro: 'Alto dividendo com segurança mínima',
  crescimento_rapido: 'Promessa de crescimento rápido',
  maior_dy_setor: 'Maior DY do setor (preço atual)',
  baixa_preco_medio: 'Ajuda a baixar seu preço médio',
  caixa: 'Guardar em caixa',
  aguardar: 'Aguardar',
};

export interface TickerMarketSnapshot {
  ticker: string;
  name?: string;
  sector: string;
  bucket: 'core' | 'opportunity';
  price: number;
  changePercent: number;
  pe?: number;
  /** DY 12m sobre preço atual (preferencial) */
  dividendYield?: number;
  dividends12mPerShare?: number;
  nextComDate?: string;
  dividendScore?: number;
  /** Preço médio na carteira do usuário (se tiver) */
  userAveragePrice?: number;
  userQuantity?: number;
}

export interface InvestmentRecommendation {
  action: 'comprar' | 'vender' | 'manter' | 'aguardar' | 'guardar';
  ticker: string;
  bucket: 'core' | 'opportunity';
  sector?: string;
  allocationPercent: number;
  suggestedAmount: number;
  suggestedQuantity?: number;
  /** Classificação da tese */
  situation: OpportunitySituation;
  situationLabel: string;
  reason: string;
  /** Texto fundamentando a recomendação */
  foundation: string;
  howWeDecided: string;
  comTiming?: string;
  risks: string[];
  /** DY usado na decisão */
  dividendYieldOnPrice?: number;
  currentPrice?: number;
  userAveragePrice?: number;
}

export interface SectorAllocationRow {
  sector: string;
  targetPercent: number;
  currentPercent: number;
  gapPercent: number;
  suggestedAmount: number;
  status: 'ok' | 'abaixo' | 'acima';
  note: string;
  /** Melhor pagadora do setor neste ciclo */
  topDividendTicker?: string;
  topDividendYield?: number;
}

export interface InvestmentAdviceReport {
  capitalAvailable: number;
  generatedAt: string;
  mode: 'ai' | 'rules';
  summary: string;
  teachingNote: string;
  coreAllocation: number;
  opportunityAllocation: number;
  opportunityReserved: number;
  sectorAllocation: SectorAllocationRow[];
  recommendations: InvestmentRecommendation[];
  portfolioAnalysis: {
    currentCorePercent: number;
    currentOpportunityPercent: number;
    sectorPercents: Record<string, number>;
    positions: AggregatedPosition[];
  };
  calendarTips: string[];
  dataSources: string[];
}

export interface SmartInsight {
  id: string;
  type: 'com_date' | 'buy_opportunity' | 'rebalance' | 'guard_cash' | 'portfolio_tip';
  priority: 'alta' | 'media' | 'baixa';
  title: string;
  message: string;
  howWeDecided: string;
  ticker?: string;
  suggestedAction?: string;
}

export interface SmartInsightsResult {
  insights: SmartInsight[];
  generatedAt: string;
}
