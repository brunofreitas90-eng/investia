import { NextRequest, NextResponse } from 'next/server';
import { chatWithAI, type ChatHistoryMessage } from '@/services/ai/openai';
import { buildChatContext } from '@/services/ai/chat-context';
import { resolvePortfolioItems } from '@/lib/resolve-portfolio-items';
import type { PortfolioItem } from '@/types';

export async function POST(request: NextRequest) {
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

    const context = await buildChatContext(items);
    const response = await chatWithAI(message.trim(), context, history);

    return NextResponse.json({
      response,
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
