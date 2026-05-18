'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { ChatDashboard } from '@/components/chat/chat-dashboard';

export default function ChatPage() {
  return (
    <PageWrapper
      title="Chat IA"
      subtitle="Assistente com dados reais da sua carteira e dividendos"
    >
      <ChatDashboard />
    </PageWrapper>
  );
}
