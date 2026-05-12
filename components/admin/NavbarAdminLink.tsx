'use client';
// components/admin/NavbarAdminLink.tsx
// Navbar 下拉菜单中的管理员入口按钮 — 仅在 isAdmin 为 true 时渲染

import Link from 'next/link';

export default function NavbarAdminLink({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Link
      href="/admin"
      className="block w-full px-4 py-2 text-left text-sm text-[#777777] hover:bg-gray-50 hover:text-[#FF7A59] transition-colors"
    >
      管理后台
    </Link>
  );
}
