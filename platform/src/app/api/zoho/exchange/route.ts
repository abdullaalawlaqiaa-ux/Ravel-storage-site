import { NextResponse } from 'next/server';
import { exchangeGrantCode } from '@/lib/zoho/auth';
import { apiError } from '@/lib/api';

/** يحوّل Grant Code من Self Client إلى Refresh Token ويكتشف المنطقة */
export async function POST(req: Request) {
  try {
    const { clientId, clientSecret, code } = await req.json();
    if (!clientId || !clientSecret || !code) throw new Error('كل الحقول مطلوبة');
    return NextResponse.json(await exchangeGrantCode(String(clientId).trim(), String(clientSecret).trim(), String(code).trim()));
  } catch (e) { return apiError(e, 400); }
}
