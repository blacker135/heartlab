// lib/auth/client.ts
// Better Auth 浏览器客户端
// 使用 NEXT_PUBLIC_AUTH_URL 作为 API 基础路径，确保客户端与服务端通信正确
// 默认回退到相对路径 /api/auth（Same-Origin 场景）

import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || '/api/auth',
});
