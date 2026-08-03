import webpush from 'web-push';

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      (process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_VAPID_SUBJECT)
  );
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

export function configureWebPush(): boolean {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ||
      process.env.NEXT_PUBLIC_VAPID_SUBJECT ||
      'mailto:delfo@investia.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return true;
}

export { webpush };
