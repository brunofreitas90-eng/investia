import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AnaliseContent } from '@/components/analise/analise-content';

function AnaliseFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
    </div>
  );
}

export default function AnalisePage() {
  return (
    <Suspense fallback={<AnaliseFallback />}>
      <AnaliseContent />
    </Suspense>
  );
}
