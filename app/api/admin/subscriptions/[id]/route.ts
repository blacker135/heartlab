// app/api/admin/subscriptions/[id]/route.ts
// GET/PATCH /api/admin/subscriptions/:id — 查看详情 / 取消 / 标记到期

import { getAdminUserId } from '@/lib/admin/guard';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { trackSubscriptionChange } from '@/lib/stats';

/** 支持的状态变更 */
const VALID_STATUSES = ['cancelled', 'expired'] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.id, id))
    .limit(1);
  if (!sub) return NextResponse.json({ error: '订阅不存在' }, { status: 404 });

  return NextResponse.json(sub);
}

// PATCH: 更新订阅状态 (取消 / 标记到期)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { status } = await req.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: '仅支持 cancelled/expired' }, { status: 400 });
  }

  await db
    .update(schema.subscriptions)
    .set({ status: status as (typeof VALID_STATUSES)[number], updatedAt: new Date() })
    .where(eq(schema.subscriptions.id, id));

  // 记录变更事件
  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.id, id))
    .limit(1);
  if (sub) {
    trackSubscriptionChange(sub.userId, sub.id, sub.variantName, status);
  }

  return NextResponse.json({ success: true });
}
