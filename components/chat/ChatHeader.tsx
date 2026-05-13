// ============================================================
// components/chat/ChatHeader.tsx — 聊天页顶部导航栏
// ============================================================
// 客户端组件，包含：
//   - 移动端汉堡菜单按钮（lg:hidden）
//   - 专家切换按钮（颜色圆点 + 名称 + ▾ 箭头，置于右侧）
// ============================================================

'use client';

import { EXPERT_META } from '@/lib/prompts/experts';
import type { ExpertId } from '@/lib/prompts/experts';

/** ChatHeader Props */
interface ChatHeaderProps {
  /** 打开专家选择面板的回调 */
  onOpenExpertPanel: () => void;
  /** 当前专家标识符 */
  expert: string;
  /** 移动端切换侧边栏的回调 */
  onToggleSidebar?: () => void;
  /** 禁用专家切换（内容生成中） */
  disabled?: boolean;
}

/** 专家名称映射（简短显示名） */
const EXPERT_SHORT_NAMES: Record<string, string> = {
  evan: 'Evan',
  liam: 'Liam',
  noah: 'Noah',
  adrian: 'Adrian',
};

/**
 * ChatHeader — 聊天页顶部导航栏
 * 左侧：移动端汉堡菜单按钮（仅移动端可见）
 * 右侧：专家切换按钮（颜色圆点 + 名称 + 下拉箭头）
 */
export function ChatHeader({
  onOpenExpertPanel,
  expert,
  onToggleSidebar,
  disabled = false,
}: ChatHeaderProps) {
  // ---------- 获取当前专家元数据 ----------
  const expertId = expert as ExpertId;
  const meta = EXPERT_META[expertId] || EXPERT_META.liam;
  const expertName = EXPERT_SHORT_NAMES[expertId] || expert;

  // ---------- 渲染 ----------
  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 lg:px-6">
      {/* 左侧：汉堡菜单按钮（仅移动端） */}
      <div className="flex items-center gap-2">
        {/* 汉堡菜单按钮 — 仅移动端显示 */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-[8px] p-2 text-[#777777] transition-colors hover:bg-gray-100 lg:hidden cursor-pointer touch-manipulation min-h-[44px] min-w-[44px]"
          aria-label="Open sidebar menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* 右侧：专家切换按钮 */}
      <button
        type="button"
        onClick={onOpenExpertPanel}
        disabled={disabled}
        className="flex items-center gap-2 rounded-[14px] border border-gray-200 bg-[#FAF7F2] px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 lg:px-4 cursor-pointer touch-manipulation min-h-[44px]"
      >
        {/* 专家颜色圆点 */}
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <span>{expertName}</span>
        {/* 下拉箭头指示 */}
        <svg
          className="ml-1 h-3 w-3 text-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </header>
  );
}
