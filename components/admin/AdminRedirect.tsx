'use client';
// components/admin/AdminRedirect.tsx
// 登录后检测是否为管理员，是则自动跳转到 /admin 管理后台

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirect({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (isAdmin) {
      router.replace('/admin');
    }
  }, [isAdmin, router]);

  return null;
}
