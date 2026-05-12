// lib/subscription/gate.ts
// 订阅门控：trial 原子检查 + 订阅状态查询
// 通过 PostgreSQL 事务 + SELECT FOR UPDATE 保证并发安全

import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export interface TrialResult {
  allowed: boolean;
  trialUsed: number;
  trialLimit: number;
}

/**
 * 试用消息原子检查与递增
 * 未订阅用户每次发消息时调用，通过行锁防止并发绕过试用限制
 */
export async function checkTrialAccess(userId: string): Promise<TrialResult> {
  const result = await db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ trialUsed: schema.profiles.trialUsed })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .for('update');

    const current = profile?.trialUsed || 0;

    if (current >= 3) {
      return { allowed: false, trialUsed: current, trialLimit: 3 };
    }

    if (!profile) {
      await tx
        .insert(schema.profiles)
        .values({ userId, trialUsed: 1 })
        .onConflictDoNothing();

      // 并发场景下另一事务可能先插入，需重新读取
      const [reProfile] = await tx
        .select({ trialUsed: schema.profiles.trialUsed })
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, userId))
        .for('update');

      return { allowed: true, trialUsed: reProfile?.trialUsed ?? 1, trialLimit: 3 };
    }

    await tx
      .update(schema.profiles)
      .set({ trialUsed: current + 1 })
      .where(eq(schema.profiles.userId, userId));

    return { allowed: true, trialUsed: current + 1, trialLimit: 3 };
  });

  return result;
}
