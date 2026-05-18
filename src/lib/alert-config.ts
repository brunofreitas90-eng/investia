import type { AlertType } from '@/types';

export const ALERT_TYPE_OPTIONS: {
  value: AlertType;
  label: string;
  description: string;
  needsPrice?: boolean;
  needsPercent?: boolean;
  schemaType?: string;
}[] = [
  {
    value: 'price_target',
    label: 'Preço alvo',
    description: 'Quando o preço atingir um valor',
    needsPrice: true,
    schemaType: 'price_target',
  },
  {
    value: 'price_drop',
    label: 'Queda de preço',
    description: 'Quando cair abaixo de um valor',
    needsPrice: true,
    schemaType: 'price_target',
  },
  {
    value: 'gain',
    label: 'Lucro na carteira',
    description: 'Ganho percentual atingido',
    needsPercent: true,
    schemaType: 'gain',
  },
  {
    value: 'loss',
    label: 'Prejuízo na carteira',
    description: 'Perda percentual atingida',
    needsPercent: true,
    schemaType: 'loss',
  },
  {
    value: 'com_date',
    label: 'Data COM',
    description: 'Aviso antes do último dia com direito',
    schemaType: 'com_date',
  },
  {
    value: 'payment',
    label: 'Pagamento',
    description: 'Aviso antes do pagamento de proventos',
    schemaType: 'payment',
  },
  {
    value: 'dividend',
    label: 'Dividendo',
    description: 'Novo provento anunciado',
    schemaType: 'dividend',
  },
];

export function getAlertTypeLabel(type: AlertType): string {
  return ALERT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

/** Tipos aceitos pelo Supabase */
export function toSchemaAlertType(type: AlertType): string {
  const opt = ALERT_TYPE_OPTIONS.find((o) => o.value === type);
  if (opt?.schemaType) return opt.schemaType;
  if (type === 'price_drop') return 'price_target';
  return type;
}

export function buildCondition(
  type: AlertType,
  params: { targetPrice?: number; percent?: number; daysBefore?: number }
): Record<string, unknown> {
  if (type === 'price_drop') {
    return {
      targetPrice: params.targetPrice,
      direction: 'below',
      daysBefore: params.daysBefore ?? 3,
    };
  }
  if (type === 'price_target') {
    return {
      targetPrice: params.targetPrice,
      direction: 'above',
      daysBefore: params.daysBefore ?? 3,
    };
  }
  if (type === 'gain' || type === 'loss') {
    return { percent: params.percent ?? 10 };
  }
  return { daysBefore: params.daysBefore ?? 3 };
}

export function describeAlert(
  type: AlertType,
  condition: Record<string, unknown>,
  ticker?: string
): string {
  const t = ticker ? `${ticker}: ` : '';
  const price = condition.targetPrice as number | undefined;
  const pct = condition.percent as number | undefined;
  const days = (condition.daysBefore as number) ?? 3;

  switch (type) {
    case 'price_target':
      return `${t}Preço acima de R$ ${price?.toFixed(2) ?? '—'}`;
    case 'price_drop':
      return `${t}Preço abaixo de R$ ${price?.toFixed(2) ?? '—'}`;
    case 'gain':
      return `${t}Lucro ≥ ${pct ?? 10}% na carteira`;
    case 'loss':
      return `${t}Prejuízo ≥ ${pct ?? 10}% na carteira`;
    case 'com_date':
      return `${t}Data COM em até ${days} dias`;
    case 'payment':
      return `${t}Pagamento em até ${days} dias`;
    case 'dividend':
      return `${t}Monitorar novos dividendos`;
    default:
      return `${t}${getAlertTypeLabel(type)}`;
  }
}
