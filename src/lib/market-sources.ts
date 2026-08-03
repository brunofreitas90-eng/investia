/** Fontes públicas priorizadas — metadados para rastreabilidade nos relatórios */
export const MARKET_SOURCES = {
  BRAPI: { id: 'brapi', label: 'BRAPI (B3)', reliability: 0.9 },
  YAHOO: { id: 'yahoo', label: 'Yahoo Finance', reliability: 0.85 },
  B3: { id: 'b3', label: 'B3 (via BRAPI)', reliability: 0.9 },
  RI: { id: 'ri', label: 'Relações com Investidores', reliability: 0.88 },
  CVM: { id: 'cvm', label: 'CVM (dados públicos)', reliability: 0.92 },
} as const;

export type SourceId = (typeof MARKET_SOURCES)[keyof typeof MARKET_SOURCES]['id'];

export function mergeSourceLabels(...ids: SourceId[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const entry = Object.values(MARKET_SOURCES).find((s) => s.id === id);
    if (entry && !seen.has(entry.label)) {
      seen.add(entry.label);
      out.push(entry.label);
    }
  }
  return out;
}

/** Cruza dois valores numéricos; retorna média se próximos, senão o mais confiável */
export function crossValidateNumber(
  primary: number | undefined,
  secondary: number | undefined,
  tolerancePercent = 15
): { value?: number; sources: SourceId[]; conflict: boolean } {
  if (primary == null && secondary == null) return { sources: [], conflict: false };
  if (primary != null && secondary == null) return { value: primary, sources: ['brapi'], conflict: false };
  if (primary == null && secondary != null) return { value: secondary, sources: ['yahoo'], conflict: false };

  const p = primary as number;
  const s = secondary as number;
  const diff = Math.abs(p - s) / Math.max(Math.abs(p), 1e-6) * 100;
  if (diff <= tolerancePercent) {
    return {
      value: (p + s) / 2,
      sources: ['brapi', 'yahoo'],
      conflict: false,
    };
  }
  return { value: p, sources: ['brapi'], conflict: true };
}
