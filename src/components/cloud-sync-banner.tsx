'use client';

import { useEffect, useState } from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  hasLocalPersonalData,
  isCloudSyncedFor,
  markCloudSynced,
  readLocalPersonalSnapshot,
} from '@/lib/migrate-personal-to-cloud';
import { isDemoModeClient } from '@/lib/demo-mode';
import { isPersonalModeClient } from '@/lib/personal-mode';

export function CloudSyncBanner() {
  const [visible, setVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    if (isDemoModeClient()) return;
    if (isPersonalModeClient()) return;

    let cancelled = false;

    (async () => {
      if (!hasLocalPersonalData()) return;

      try {
        const res = await fetch('/api/auth/session-status', { cache: 'no-store' });
        const status = (await res.json()) as { mode?: string; userId?: string };
        if (cancelled || status.mode !== 'cloud' || !status.userId) return;
        if (isCloudSyncedFor(status.userId)) return;

        const snap = readLocalPersonalSnapshot();
        setUserId(status.userId);
        setItemCount(
          snap.portfolio.length + snap.watchlist.length + snap.operations.length
        );
        setVisible(true);

        // Se a nuvem ainda está vazia, sobe automaticamente (sem apagar o local)
        const cloudRes = await fetch('/api/portfolio', { cache: 'no-store' });
        if (!cancelled && cloudRes.ok) {
          const cloud = (await cloudRes.json()) as { rawItemCount?: number; items?: unknown[] };
          const cloudCount =
            cloud.rawItemCount ??
            (Array.isArray(cloud.items) ? cloud.items.length : 0);
          if (cloudCount === 0 && snap.portfolio.length > 0) {
            setSyncing(true);
            const migrateRes = await fetch('/api/migrate/local-to-cloud', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                portfolio: snap.portfolio,
                watchlist: snap.watchlist,
                goal: snap.goal,
                alerts: snap.alerts,
                preferences: snap.preferences,
                operations: snap.operations,
              }),
            });
            const data = await migrateRes.json();
            if (migrateRes.ok) {
              markCloudSynced(status.userId);
              if (!cancelled) {
                setVisible(false);
                toast.success(
                  'Dados deste aparelho enviados para a nuvem. Use o mesmo email no PC.'
                );
                window.location.reload();
              }
            } else if (!cancelled) {
              toast.error(data.error || 'Falha na sincronização automática.');
              setSyncing(false);
            }
          }
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function syncNow() {
    if (!userId) return;
    setSyncing(true);
    try {
      const snap = readLocalPersonalSnapshot();
      const res = await fetch('/api/migrate/local-to-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio: snap.portfolio,
          watchlist: snap.watchlist,
          goal: snap.goal,
          alerts: snap.alerts,
          preferences: snap.preferences,
          operations: snap.operations,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Falha ao sincronizar.');
        return;
      }

      markCloudSynced(userId);
      setVisible(false);
      toast.success(
        'Dados do celular/navegador enviados para a nuvem. Agora o PC verá a mesma carteira.'
      );
      window.location.reload();
    } catch {
      toast.error('Erro de rede ao sincronizar.');
    } finally {
      setSyncing(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="border-b border-sky-500/25 bg-sky-500/10 px-4 py-3 text-center text-sm text-sky-100">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
        <p>
          Encontramos dados neste aparelho ({itemCount} itens). Envie para a nuvem
          para usar no celular e no PC — a cópia local não será apagada.
        </p>
        <Button size="sm" onClick={syncNow} disabled={syncing} className="shrink-0">
          {syncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <CloudUpload className="h-4 w-4" />
              Sincronizar agora
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
