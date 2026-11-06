import { NextResponse } from 'next/server';
import { getDataSource } from '@/lib/data';
import { runUnitAction, type UnitAction } from '@/lib/actions';
import { apiError } from '@/lib/api';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const action = (await req.json()) as UnitAction;
    const result = await runUnitAction(getDataSource(), decodeURIComponent(id), action);
    return NextResponse.json(result);
  } catch (e) { return apiError(e, 400); }
}
