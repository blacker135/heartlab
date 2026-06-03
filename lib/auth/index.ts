// lib/auth/index.ts
// Better Auth 服务端实例
// 配置 drizzleAdapter + email/password provider
// trustedOrigins: 显式配置可信来源，避免 Vercel 反向代理下 Origin 校验失败(403)

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from '@/lib/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  // 显式配置 baseURL 和 trustedOrigins，防止 Vercel 代理环境下 Origin 校验失败
  baseURL: process.env.BETTER_AUTH_URL || '',
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || '',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean),
});
