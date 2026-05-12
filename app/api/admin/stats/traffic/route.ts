// app/api/admin/stats/traffic/route.ts
// GET /api/admin/stats/traffic — 流量数据统计

import { getAdminUserId } from '@/lib/admin/guard';
import { queryTrafficSeries } from '@/lib/stats';
import type { DateRange } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') || new Date().toISOString().slice(0, 10);
  const end = searchParams.get('end') || new Date().toISOString().slice(0, 10);

  const range: DateRange = { start, end };

  try {
    const traffic = await queryTrafficSeries(range);
    return NextResponse.json(traffic);
  } catch (error) {
    console.error('[AdminStatsTraffic] 获取流量统计失败:', error);
    return NextResponse.json({ error: '获取流量统计失败' }, { status: 500 });
  }
}
