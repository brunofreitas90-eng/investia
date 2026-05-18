import OpenAI from 'openai';
import type { CompanyAnalysis, PortfolioItem, Quote } from '@/types';
import { normalizeBuyScore, scoreToRecommendation } from '@/lib/buy-score';
import type { ChatContextPayload } from './chat-context';
import { formatContextForPrompt } from './chat-context';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function mapAnalysis(
  ticker: string,
  parsed: Record<string, unknown>
): CompanyAnalysis {
  const buyScore = normalizeBuyScore(parsed.buyScore ?? parsed.score);
  const rec = scoreToRecommendation(buyScore);

  return {
    ticker,
    summary: String(parsed.summary || ''),
    valuation: String(parsed.valuation || ''),
    debt: String(parsed.debt || ''),
    profit: String(parsed.profit || ''),
    growth: String(parsed.growth || ''),
    dividends: String(parsed.dividends || ''),
    governance: String(parsed.governance || ''),
    trend: String(parsed.trend || ''),
    recommendation: (parsed.recommendation as CompanyAnalysis['recommendation']) || rec.recommendation,
    score: Math.round(buyScore * 10),
    buyScore,
    buyRecommendation: String(parsed.buyRecommendation || rec.buyRecommendation),
    buyRecommendationLabel:
      (parsed.buyRecommendationLabel as CompanyAnalysis['buyRecommendationLabel']) ||
      rec.buyRecommendationLabel,
    plainLanguage: String(parsed.plainLanguage || parsed.summary || ''),
  };
}

export async function analyzeCompany(
  ticker: string,
  fundamentals: Record<string, unknown>,
  quote?: Quote | null
): Promise<CompanyAnalysis> {
  const openai = getOpenAI();
  if (!openai) {
    return mockAnalysis(ticker, fundamentals, quote);
  }

  const prompt = `Analise a ação ${ticker} para investidores brasileiros iniciantes.
Dados: ${JSON.stringify({ fundamentals, quote })}

Responda APENAS JSON válido com:
- summary, valuation, debt, profit, growth, dividends, governance, trend
- buyScore: número de 0 a 10 (nota para RECOMENDAÇÃO DE COMPRA; 0=péssimo, 10=excelente oportunidade)
- buyRecommendation: frase curta da recomendação (ex: "Compra forte — P/L atrativo e dividendos consistentes")
- buyRecommendationLabel: um de "compra_forte"|"compra"|"neutro"|"cautela"|"evitar"
- recommendation: buy|hold|sell|neutral (coerente com buyScore)
- plainLanguage: 2-3 frases simples incluindo a nota e se deve comprar ou não`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Você é analista da InvestIA. Dê nota de compra de 0 a 10 sempre. Linguagem simples. Só JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return mapAnalysis(ticker, JSON.parse(content));
  } catch {
    return mockAnalysis(ticker, fundamentals, quote);
  }
}

function mockAnalysis(
  ticker: string,
  fundamentals: Record<string, unknown>,
  quote?: Quote | null
): CompanyAnalysis {
  const pe = fundamentals.pe as number | undefined;
  const dy = fundamentals.dividendYield as number | undefined;
  const roe = fundamentals.roe as number | undefined;
  const returns = fundamentals.returns as { annual?: number; projected?: number } | undefined;
  const price = quote?.price;

  let buyScore = 5.5;
  if (pe && pe < 12) buyScore += 1.2;
  if (pe && pe > 22) buyScore -= 1;
  if (roe && roe > 15) buyScore += 0.8;
  if (dy && dy > 6) buyScore += 0.5;
  if (returns?.annual && returns.annual > 10) buyScore += 0.5;

  const rec = scoreToRecommendation(buyScore);

  let plain = `${ticker} — Nota de compra: ${rec.buyScore}/10. ${rec.buyRecommendation} `;
  if (price) plain += `Preço: R$ ${price.toFixed(2)}. `;

  return {
    ticker,
    summary: plain,
    valuation: pe ? `P/L de ${pe.toFixed(1)}` : 'Dados parciais',
    debt: 'Consulte demonstrações financeiras',
    profit: 'Lucro estável no último período',
    growth: 'Crescimento moderado',
    dividends: dy ? `Yield ${dy.toFixed(1)}%` : 'Verificar histórico',
    governance: 'Empresa listada na B3',
    trend: quote && quote.changePercent >= 0 ? 'Tendência de alta' : 'Tendência de baixa',
    recommendation: rec.recommendation,
    score: Math.round(rec.buyScore * 10),
    buyScore: rec.buyScore,
    buyRecommendation: rec.buyRecommendation,
    buyRecommendationLabel: rec.buyRecommendationLabel,
    plainLanguage: plain,
  };
}

export async function chatWithAI(
  message: string,
  context: ChatContextPayload,
  history: ChatHistoryMessage[] = []
): Promise<string> {
  const openai = getOpenAI();

  if (!openai) {
    return mockChatResponse(message, context);
  }

  const systemPrompt = `Você é o assistente InvestIA, especialista em investimentos para brasileiros iniciantes.
Responda em português do Brasil, de forma clara e objetiva (máximo 3 parágrafos curtos).
Use APENAS os dados do contexto da carteira abaixo. Se não souber, diga honestamente.
Não invente tickers ou valores. Valores em R$ com formato brasileiro quando citar números.
Sugira módulos do app quando útil: IA Analista (/analise), Dividendos, Carteira, Imposto, Radar.

CONTEXTO DA CARTEIRA (dados reais):
${formatContextForPrompt(context)}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.6,
      max_tokens: 900,
    });
    return completion.choices[0]?.message?.content || 'Desculpe, não consegui responder.';
  } catch {
    return mockChatResponse(message, context);
  }
}

function mockChatResponse(
  message: string,
  ctx: ChatContextPayload
): string {
  const lower = message.toLowerCase();
  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (ctx.qtdAtivos === 0) {
    return 'Sua carteira está vazia. Adicione ativos em Carteira.';
  }
  const patrimonio = ctx.patrimonio;
  const dividendos = ctx.dividendosRecebidos12m;

  if (lower.includes('nota') || lower.includes('comprar') || lower.includes('recomend')) {
    return 'Use o módulo IA Analista: digite o ticker e veja a nota de 0 a 10 com recomendação de compra.';
  }
  if (lower.includes('dividendo') || lower.includes('provento')) {
    return `Proventos 12m: ${fmt(dividendos)}. Previstos: ${fmt(ctx.dividendosPrevistos)}.`;
  }
  if (lower.includes('ir') || lower.includes('imposto')) {
    return 'Para ações: vendas até R$ 20.000/mês são isentas. Use o módulo Imposto de Renda.';
  }
  const lista = ctx.ativos.map((a) => a.ticker).join(', ');
  return `Patrimônio ${fmt(patrimonio)}, ${ctx.qtdAtivos} ativos (${lista}). Lucro ${fmt(ctx.lucro)}. Dividendos: ${fmt(dividendos)}.`;
}

export async function findOpportunities(
  tickers: {
    ticker: string;
    name?: string;
    pe?: number;
    dividendYield?: number;
    changePercent?: number;
  }[]
): Promise<
  { ticker: string; type: string; score: number; reason: string; name?: string }[]
> {
  const openai = getOpenAI();
  if (!openai) return [];

  const prompt = `Você é analista de investimentos brasileiro. A partir dos dados abaixo, identifique até 8 oportunidades de investimento.

Dados (array JSON): ${JSON.stringify(tickers.slice(0, 20))}

Tipos permitidos:
- discounted: ativo em queda que pode estar barato
- high_dividend: yield elevado
- growth: valorização moderada
- trending: forte alta recente
- forgotten: estável com bons proventos

Retorne APENAS JSON válido:
{
  "opportunities": [
    {
      "ticker": "PETR4",
      "type": "high_dividend",
      "score": 75,
      "reason": "Frase curta em português explicando o porquê"
    }
  ]
}

Regras: score 0-100; máximo 8 itens; reason em português; priorize diversidade de tipos.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return parsed.opportunities || [];
  } catch {
    return [];
  }
}
