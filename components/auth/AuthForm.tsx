// ============================================================
// components/auth/AuthForm.tsx — 登录/注册表单组件
// ============================================================
// 客户端组件，支持以下功能：
//   - 邮箱/密码登录（signInWithPassword）
//   - 邮箱/密码注册（signUp）
//   - 登录/注册模式切换
//   - 加载状态、成功/错误消息显示
// ============================================================

'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * AuthForm — 统一的登录/注册表单组件
 * 使用 rounded-[24px] 卡片、rounded-[18px] 输入框、rounded-[16px] 提交按钮
 */
export function AuthForm() {
  // ---------- 表单状态 ----------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);   // false = 登录模式, true = 注册模式
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ---------- 表单提交处理 ----------
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    try {
      if (isSignUp) {
        // 注册模式：创建新账户（发送确认邮件）
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/en/auth/callback`,
          },
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          setMessage({
            type: 'success',
            text: 'Check your email for the confirmation link.',
          });
        }
      } else {
        // 登录模式：使用邮箱密码登录
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          // 登录成功，刷新页面以触发 middleware 重定向
          window.location.href = '/en/chat/liam';
        }
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------- 渲染 ----------
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* 登录卡片 — 圆角 24px，阴影柔和 */}
      <div className="w-full max-w-md rounded-[24px] bg-white p-8 shadow-soft">
        {/* 标题 */}
        <h1 className="text-center text-2xl font-semibold text-text-primary">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          {isSignUp
            ? 'Start your journey with Lunara'
            : 'Sign in to continue your conversations'}
        </p>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* 邮箱输入框 */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-5 py-3 text-sm text-text-primary placeholder-gray-400 outline-none transition-all focus:border-[#FF7A59]/40 focus:ring-2 focus:ring-[#FF7A59]/10"
            />
          </div>

          {/* 密码输入框 */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              minLength={6}
              className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-5 py-3 text-sm text-text-primary placeholder-gray-400 outline-none transition-all focus:border-[#FF7A59]/40 focus:ring-2 focus:ring-[#FF7A59]/10"
            />
          </div>

          {/* 错误/成功消息 */}
          {message && (
            <div
              className={`rounded-[12px] px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[16px] bg-[#FF7A59] py-3 text-sm font-medium text-white transition-all hover:bg-[#FF7A59]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : isSignUp
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        {/* 切换登录/注册模式 */}
        <p className="mt-6 text-center text-sm text-text-secondary">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(null);
            }}
            className="font-medium text-[#FF7A59] hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
