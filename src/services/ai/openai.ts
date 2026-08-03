import OpenAI from 'openai';
import type { CompanyAnalysis, PortfolioItem, Quote } from '@/types';
import { normalizeBuyScore, scoreToRecommendation } from '@/lib/buy-score';
import type { ChatContextPayload } from './chat-context';
import { formatContextForPrompt } from './chat-context';
import { CHAT_SYSTEM_PERSONA } from '@/lib/investment-strategy';
import { PLAIN_LANGUAGE_RULES } from '@/lib/plain-language';
import type { EnhancedChatContext } from './enhanced-chat-context';
import { answerFromContext, isOpenAIAvailable } from '@/lib/chat-intents';

export { isOpenAIAvailable };

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
            'Você é analista da DelfoInvestIA. Dê nota de compra de 0 a 10 sempre. Linguagem simples. Só JSON.',
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

export type ChatResponseMode = 'ai' | 'rules';

export async function chatWithAI(
  message: string,
  context: ChatContextPayload | EnhancedChatContext,
  history: ChatHistoryMessage[] = [],
  formatContext: (ctx: ChatContextPayload | EnhancedChatContext) => string = formatContextForPrompt
): Promise<{ text: string; mode: ChatResponseMode }> {
  const openai = getOpenAI();

  if (!openai) {
    return { text: answerFromContext(message, context), mode: 'rules' };
  }

  const hasMarket = 'mercado' in context && context.mercado != null;
  const hasResearch =
    'empresasPesquisadas' in context &&
    Array.isArray(context.empresasPesquisadas) &&
    context.empresasPesquisadas.length > 0;

  const systemPrompt = `${CHAT_SYSTEM_PERSONA}
${PLAIN_LANGUAGE_RULES}

MODO CHAT — responda exatamente o que foi perguntado, com profundidade útil.
REGRAS DE DADOS:
- Quando o JSON tiver preços, yields, datas COM ou empresasPesquisadas, use esses números reais e cite-os.
- Nunca invente uma cotação exata (R$ X,XX) se ela não estiver no contexto.
- Conceitos, estratégias, setores, histórico de mercado, comparação de empresas e educação financeira: responda com conhecimento geral, mesmo que não estejam no JSON.
- Nunca diga que só pode falar do que está no app. Você cobre o mercado de ações como um todo.
- Se a pergunta misturar carteira + mercado geral, use a carteira do JSON e complete com conhecimento de mercado.
- Para preço teto / rendimento alvo: use precosTeto e proventos12mPorAcao quando existirem.
${hasMarket ? 'Há dados de mercado no contexto: quedas do dia, yields e pagadores mensais.' : ''}
${hasResearch ? 'Há empresasPesquisadas com cotações e dividendos REAIS — priorize esses números.' : ''}

CONTEXTO DO USUÁRIO E DADOS AO VIVO (JSON — use quando relevante; não limite o assunto a isto):
${formatContext(context)}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.45,
      max_tokens: 2000,
    });
    const text =
      completion.choices[0]?.message?.content || 'Desculpe, não consegui responder.';
    return { text, mode: 'ai' };
  } catch {
    return { text: answerFromContext(message, context), mode: 'rules' };
  }
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
