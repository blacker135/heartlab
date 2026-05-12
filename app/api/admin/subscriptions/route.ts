// app/api/admin/subscriptions/route.ts
// GET /api/admin/subscriptions — 订阅列表（按状态筛选/分页）

import { getAdminUserId } from '@/lib/admin/guard';
import { querySubscriptions } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    const data = await querySubscriptions({
      status: status || undefined,
      page,
      pageSize,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AdminSubscriptions] 获取订阅列表失败:', error);
    return NextResponse.json({ error: '获取订阅列表失败' }, { status: 500 });
  }
}
