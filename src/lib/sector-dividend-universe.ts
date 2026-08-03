import type { CoreSector } from '@/lib/investment-strategy';
import { CORE_TICKERS_BY_SECTOR } from '@/lib/investment-strategy';

/**
 * Universo ampliado de ações líquidas por setor do núcleo.
 * Inclui as do núcleo da estratégia + peers relevantes da B3.
 */
export const SECTOR_DIVIDEND_UNIVERSE: Record<
  CoreSector,
  { ticker: string; name: string }[]
> = {
  Bancos: [
    { ticker: 'ITUB4', name: 'Itaú Unibanco' },
    { ticker: 'BBDC4', name: 'Bradesco' },
    { ticker: 'BBAS3', name: 'Banco do Brasil' },
    { ticker: 'SANB11', name: 'Santander Brasil' },
    { ticker: 'BPAC11', name: 'BTG Pactual' },
    { ticker: 'ABCB4', name: 'ABC Brasil' },
    { ticker: 'BRSR6', name: 'Banrisul' },
    { ticker: 'BMGB4', name: 'Banco BMG' },
    { ticker: 'BPAN4', name: 'Banco Pan' },
    { ticker: 'BMEB4', name: 'Banco Mercantil' },
  ],
  Seguradoras: [
    { ticker: 'BBSE3', name: 'BB Seguridade' },
    { ticker: 'PSSA3', name: 'Porto Seguro' },
    { ticker: 'CXSE3', name: 'Caixa Seguridade' },
    { ticker: 'IRBR3', name: 'IRB Brasil' },
    { ticker: 'SULA11', name: 'SulAmérica' },
    { ticker: 'WIZC3', name: 'Wiz Co' },
  ],
  Energia: [
    { ticker: 'TAEE11', name: 'Taesa' },
    { ticker: 'EGIE3', name: 'Engie Brasil' },
    { ticker: 'CPLE6', name: 'Copel' },
    { ticker: 'CMIG4', name: 'Cemig' },
    { ticker: 'EQTL3', name: 'Equatorial' },
    { ticker: 'ISAE4', name: 'ISA Energia' },
    { ticker: 'ELET3', name: 'Eletrobras' },
    { ticker: 'ELET6', name: 'Eletrobras PN' },
    { ticker: 'CPFE3', name: 'CPFL Energia' },
    { ticker: 'NEOE3', name: 'Neoenergia' },
    { ticker: 'AURE3', name: 'Auren' },
    { ticker: 'ENGI11', name: 'Energisa' },
    { ticker: 'TRPL4', name: 'CTEEP' },
    { ticker: 'ALUP11', name: 'Alupar' },
    { ticker: 'AESB3', name: 'AES Brasil' },
    { ticker: 'ENEV3', name: 'Eneva' },
    { ticker: 'REDE3', name: 'Rede Energia' },
  ],
  Saneamento: [
    { ticker: 'SBSP3', name: 'Sabesp' },
    { ticker: 'SAPR4', name: 'Sanepar' },
    { ticker: 'SAPR11', name: 'Sanepar UNT' },
    { ticker: 'CSMG3', name: 'Copasa' },
    { ticker: 'CASN3', name: 'Casan' },
    { ticker: 'ORVR3', name: 'Orizon' },
  ],
};

export const SECTOR_ORDER: CoreSector[] = [
  'Bancos',
  'Seguradoras',
  'Energia',
  'Saneamento',
];

export function allSectorTickers(): string[] {
  const set = new Set<string>();
  for (const sector of SECTOR_ORDER) {
    for (const row of SECTOR_DIVIDEND_UNIVERSE[sector]) {
      set.add(row.ticker);
    }
    for (const t of CORE_TICKERS_BY_SECTOR[sector]) {
      set.add(t);
    }
  }
  return [...set];
}
