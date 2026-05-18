'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { demoPortfolio } from '@/lib/demo-data';
import { isDemoModeClient, loadDemoPortfolio } from '@/lib/demo-portfolio-storage';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  'Como está minha carteira?',
  'Quanto recebi de dividendos?',
  'Qual ativo rende mais na carteira?',
  'Tenho eventos importantes em breve?',
  'Quanto preciso declarar no IR?',
];

function getPortfolioItemsForChat() {
  if (isDemoModeClient()) {
    const stored = loadDemoPortfolio();
    return stored?.length ? stored : demoPortfolio;
  }
  return undefined;
}

export function ChatDashboard() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou seu assistente InvestIA. Pergunte sobre sua carteira, dividendos, rendimentos ou imposto — uso os dados reais dos seus ativos.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextHint, setContextHint] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const history = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const portfolioItems = getPortfolioItemsForChat();

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: history.slice(-10),
          ...(portfolioItems ? { portfolioItems } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao processar mensagem');
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: 'Não consegui processar sua pergunta. Tente novamente.',
          },
        ]);
        return;
      }

      setMessages((m) => [...m, { role: 'assistant', content: data.response }]);

      if (data.contextSummary?.qtdAtivos > 0) {
        setContextHint(
          `Carteira: ${data.contextSummary.qtdAtivos} ativos · ${formatCurrency(data.contextSummary.patrimonio)}`
        );
      } else {
        setContextHint('Carteira vazia — adicione ativos para respostas personalizadas');
      }
    } catch {
      toast.error('Falha na conexão');
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Erro de conexão. Verifique sua internet e tente de novo.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-4xl mx-auto">
      {contextHint && (
        <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
          <Wallet className="h-3.5 w-3.5 text-emerald-400" />
          {contextHint}
          <Badge variant="secondary" className="text-[10px]">
            dados ao vivo
          </Badge>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}
          >
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                msg.role === 'user' ? 'bg-emerald-500/20' : 'bg-white/5'
              )}
            >
              {msg.role === 'user' ? (
                <User className="h-4 w-4 text-emerald-400" />
              ) : (
                <Bot className="h-4 w-4 text-zinc-400" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-emerald-500/15 text-white'
                  : 'bg-white/[0.03] border border-white/[0.06] text-zinc-200'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            Analisando sua carteira...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => send(s)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Pergunte sobre sua carteira, dividendos, IR..."
          disabled={loading}
        />
        <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

