import { NextRequest, NextResponse } from 'next/server';
import { isPushConfigured, getVapidPublicKey } from '@/lib/push/vapid';

export async function GET() {
  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
}
