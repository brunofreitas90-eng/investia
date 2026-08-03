// Gera par de chaves VAPID para Web Push
// Uso: node scripts/generate-vapid-keys.mjs

import webpush from 'web-push';
import { randomBytes } from 'node:crypto';

const keys = webpush.generateVAPIDKeys();
const cronSecret = randomBytes(24).toString('base64url');

console.log(`
Cole estas variáveis na Vercel (Production):

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
VAPID_SUBJECT=mailto:seu-email@dominio.com
CRON_SECRET=${cronSecret}

Depois rode o SQL em supabase/migrations/20260803140000_push_subscriptions.sql
e faça redeploy.
`);
