import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrDemo } from '@/lib/api-guard';
import { chatWithAI, isOpenAIAvailable, type ChatHistoryMessage } from '@/services/ai/openai';
import {
  buildEnhancedChatContext,
  formatEnhancedContextForPrompt,
} from '@/services/ai/enhanced-chat-context';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import type { PortfolioItem } from '@/types';

export async function POST(request: NextRequest) {
  const access = await requireAuthOrDemo(request);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const message = body.message as string;
    const history = (body.history ?? []) as ChatHistoryMessage[];

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
    }

    let items: PortfolioItem[];
    if (Array.isArray(body.portfolioItems) && body.portfolioItems.length > 0) {
      items = body.portfolioItems as PortfolioItem[];
    } else {
      items = await resolvePortfolioItems();
    }

    const context = await buildEnhancedChatContext(items, message.trim());
    const { text, mode } = await chatWithAI(
      message.trim(),
      context,
      history,
      (ctx) => formatEnhancedContextForPrompt(ctx as typeof context)
    );

    return NextResponse.json({
      response: text,
      mode,
      aiAvailable: isOpenAIAvailable(),
      contextSummary: {
        patrimonio: context.patrimonio,
        qtdAtivos: context.qtdAtivos,
        dividendos12m: context.dividendosRecebidos12m,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erro no chat' }, { status: 500 });
  }
}
