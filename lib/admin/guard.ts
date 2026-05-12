// lib/admin/guard.ts
// 管理员权限守卫 — 校验当前用户是否为 admin
// 调用方式：在每个 /api/admin/* route 入口调用 await getAdminUserId()

import { auth } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * 从当前 session 获取 userId，并校验是否为 admin
 * 如果是 admin → 返回 userId
 * 如果不是 → 返回 403/401 Response
 */
export async function getAdminUserId(): Promise<string | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.variantName, 'admin'),
        eq(schema.subscriptions.status, 'active'),
      ),
    )
    .limit(1);

  if (!sub) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  return userId;
}

/**
 * 前端页面权限守卫（Server Component 用）
 * 返回 true/false，不抛 Response
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;

  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.variantName, 'admin'),
        eq(schema.subscriptions.status, 'active'),
      ),
    )
    .limit(1);

  return !!sub;
}
