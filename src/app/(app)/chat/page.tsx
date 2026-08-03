'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { AiStatusBanner } from '@/components/ai-status-banner';
import { ChatDashboard } from '@/components/chat/chat-dashboard';

export default function ChatPage() {
  return (
    <PageWrapper
      title="Chat IA"
      subtitle="Assistente com dados reais da sua carteira e dividendos"
    >
      <div className="space-y-4">
        <AiStatusBanner />
        <ChatDashboard />
      </div>
    </PageWrapper>
  );
}
