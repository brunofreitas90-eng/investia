import type { AssetType, PortfolioItem } from '@/types';

export interface PortfolioLot {
  id: string;
  quantity: number;
  average_price: number;
  purchase_date: string;
  invested: number;
}

export interface AggregatedPosition {
  ticker: string;
  asset_type: AssetType;
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  /** DY de mercado (cotação), legado */
  dividendYield?: number;
  /** Média anual de proventos/ação nos últimos 5 anos */
  dividends5yAvgPerShare?: number;
  /** Estimativa anual da posição: média 5a × quantidade */
  dividends5yAnnualAmount?: number;
  /** Total de proventos/ação somados nos últimos 5 anos */
  dividends5yTotalPerShare?: number;
  /** Total estimado da posição nos últimos 5 anos */
  dividends5yTotalAmount?: number;
  /** Yield a.a. da média 5a sobre o preço médio de compra */
  dividendYieldOnCost?: number;
  purchaseCount: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  lots: PortfolioLot[];
}

/** Agrupa todas as compras do mesmo ticker e recalcula preço médio ponderado */
export function aggregatePortfolioPositions(
  items: PortfolioItem[]
): AggregatedPosition[] {
  const map = new Map<string, AggregatedPosition & { _lots: PortfolioLot[] }>();

  for (const item of items) {
    const key = `${item.ticker.toUpperCase()}::${item.asset_type}`;
    const invested = item.quantity * item.average_price;
    const lot: PortfolioLot = {
      id: item.id,
      quantity: item.quantity,
      average_price: item.average_price,
      purchase_date: item.purchase_date,
      invested,
    };

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ticker: item.ticker.toUpperCase(),
        asset_type: item.asset_type,
        totalQuantity: item.quantity,
        averagePrice: item.average_price,
        totalInvested: invested,
        currentPrice: item.current_price ?? item.average_price,
        currentValue: item.current_value ?? item.quantity * (item.current_price ?? item.average_price),
        profitLoss: item.profit_loss ?? 0,
        profitLossPercent: item.profit_loss_percent ?? 0,
        dividendYield: item.dividend_yield,
        purchaseCount: 1,
        firstPurchaseDate: item.purchase_date,
        lastPurchaseDate: item.purchase_date,
        lots: [lot],
        _lots: [lot],
      });
      continue;
    }

    existing._lots.push(lot);
    existing.totalQuantity += item.quantity;
    existing.totalInvested += invested;
    existing.averagePrice =
      existing.totalQuantity > 0 ? existing.totalInvested / existing.totalQuantity : 0;
    existing.purchaseCount += 1;

    if (item.purchase_date < (existing.firstPurchaseDate ?? item.purchase_date)) {
      existing.firstPurchaseDate = item.purchase_date;
    }
    if (item.purchase_date > (existing.lastPurchaseDate ?? item.purchase_date)) {
      existing.lastPurchaseDate = item.purchase_date;
    }

    const price = item.current_price ?? item.average_price;
    existing.currentPrice = price;
    existing.currentValue = existing.totalQuantity * price;
    existing.profitLoss = existing.currentValue - existing.totalInvested;
    existing.profitLossPercent =
      existing.totalInvested > 0
        ? (existing.profitLoss / existing.totalInvested) * 100
        : 0;
    existing.dividendYield = item.dividend_yield ?? existing.dividendYield;
    existing.lots = existing._lots;
  }

  return Array.from(map.values())
    .map(({ _lots, ...pos }) => pos)
    .sort((a, b) => b.currentValue - a.currentValue);
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock_br: 'Ação BR',
  stock_us: 'Ação US',
  fii: 'FII',
  etf: 'ETF',
  bdr: 'BDR',
};
