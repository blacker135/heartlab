// ============================================================
// GET /[lang]/auth/callback — Supabase Auth 回调处理
// ============================================================
// 处理 OAuth / Magic Link 回调：
//   1. 从 URL 提取 auth code
//   2. 通过 exchangeCodeForSession 换取 session
//   3. 重定向到聊天页面
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Auth 回调 GET 处理器
 * Supabase 在用户点击确认链接后将 code 参数附加到回调 URL
 * 此路由负责将 code 兑换为 session 并重定向
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  // 默认语言为英文，可从 referer 或 cookie 中提取
  const lang = 'en';

  if (code) {
    const supabase = await createServerSupabase();
    // 将一次性 code 兑换为持久 session（写入 cookie）
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 登录成功后重定向到 Liam 的聊天页面
  return NextResponse.redirect(new URL(`/${lang}/chat/liam`, req.url));
}
