# Chat UI/UX 改进实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 AI 对话页进行全面 UI/UX 改进 — 图标系统替换、触摸交互优化、响应式布局适配

**Architecture:** 创建可复用的 ExpertAvatar 组件作为共享依赖，然后逐个改进 6 个现有聊天组件。每个任务独立可验证，按依赖顺序执行。

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Framer Motion, next-intl

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `components/chat/ExpertAvatar.tsx` | 新建 | 可复用专家头像（彩色圆形 + 首字母），替换 emoji |
| `components/chat/WelcomeCard.tsx` | 修改 | 使用 ExpertAvatar，建议按钮图标替换，响应式 |
| `components/chat/ExpertSwitchPanel.tsx` | 修改 | 使用 ExpertAvatar，响应式面板 |
| `components/chat/MessageBubble.tsx` | 修改 | 响应式气泡宽度/字体/间距 |
| `components/chat/ChatInput.tsx` | 修改 | 触摸目标、iOS 安全区、响应式 |
| `components/chat/ChatSidebar.tsx` | 修改 | 删除按钮、移动端抽屉、Plus 图标 |
| `components/chat/ChatHeader.tsx` | 修改 | 触摸目标、cursor-pointer |
| `components/chat/MessageList.tsx` | 修改 | 新消息按钮 cursor-pointer |

---

### Task 1: 创建 ExpertAvatar 可复用组件

**文件：**
- 创建: `components/chat/ExpertAvatar.tsx`

- [ ] **Step 1: 创建 ExpertAvatar 组件**

```typescript
// components/chat/ExpertAvatar.tsx
// 可复用专家头像组件 — 彩色圆形 + 名字首字母，替换 emoji 图标

import type { ExpertId } from '@/lib/prompts/experts';
import { EXPERT_META } from '@/lib/prompts/experts';

/** 首字母映射 */
const EXPERT_INITIAL: Record<ExpertId, string> = {
  evan: 'E',
  liam: 'L',
  noah: 'N',
  adrian: 'A',
};

interface ExpertAvatarProps {
  expert: ExpertId;
  /** 尺寸: 'sm' = h-12 w-12, 'md' = h-16 w-16, 'lg' = h-20 w-20 */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-12 w-12 text-xl',
  md: 'h-16 w-16 text-2xl',
  lg: 'h-20 w-20 text-4xl',
} as const;

/** 获取不同尺寸对应的响应式类名 */
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  return SIZE_CLASSES[size];
}

export function ExpertAvatar({ expert, size = 'md', className = '' }: ExpertAvatarProps) {
  const meta = EXPERT_META[expert] || EXPERT_META.liam;
  const initial = EXPERT_INITIAL[expert] || 'L';
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white select-none ${sizeClasses} ${className}`}
      style={{ backgroundColor: meta.color }}
      aria-label={`${expert} avatar`}
    >
      {initial}
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors related to ExpertAvatar.

- [ ] **Step 3: 提交**

```bash
git add components/chat/ExpertAvatar.tsx
git commit -m "feat: add ExpertAvatar component to replace emoji icons"
```

---

### Task 2: 改进 WelcomeCard — 图标替换 + 响应式

**文件：**
- 修改: `components/chat/WelcomeCard.tsx`

- [ ] **Step 1: 替换 ExpertAvatar 和 MessageCircle 图标**

修改 `components/chat/WelcomeCard.tsx`：

```typescript
// components/chat/WelcomeCard.tsx

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { EXPERT_META } from '@/lib/prompts/experts';
import type { ExpertId } from '@/lib/prompts/experts';
import { ExpertAvatar } from './ExpertAvatar';

interface WelcomeCardProps {
  expert: string;
  onSuggestionClick: (text: string) => void;
}

export function WelcomeCard({ expert, onSuggestionClick }: WelcomeCardProps) {
  const t = useTranslations();
  const expertId = (expert || 'liam') as ExpertId;
  const meta = EXPERT_META[expertId] || EXPERT_META.liam;

  const greeting = t(`welcome.${expertId}.greeting`);
  const role = t(`welcome.${expertId}.role`);
  const intro = t(`welcome.${expertId}.intro`);

  const suggestion1 = t(`welcome.${expertId}.suggestions.0`);
  const suggestion2 = t(`welcome.${expertId}.suggestions.1`);
  const suggestion3 = t(`welcome.${expertId}.suggestions.2`);
  const suggestions = [suggestion1, suggestion2, suggestion3].filter(Boolean);

  return (
    <motion.div
      className="flex flex-col items-center px-4 py-8 sm:py-12 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* 专家首字母头像 — 替换 emoji */}
      <ExpertAvatar expert={expertId} size="lg" className="mb-6" />

      {/* 问候语 */}
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">{greeting}</h2>

      {/* 角色 */}
      <p className="mt-2 text-sm font-medium text-[#FF7A59]">{role}</p>

      {/* 介绍文本 */}
      <p className="mt-4 max-w-md sm:max-w-lg text-sm sm:text-base leading-relaxed text-text-secondary">
        {intro}
      </p>

      {/* 建议问题按钮 — 💬 → MessageCircle SVG */}
      {suggestions.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSuggestionClick(suggestion)}
              className="inline-flex items-center gap-2 rounded-[16px] border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary shadow-soft transition-colors hover:border-[#FF7A59]/30 hover:bg-[#FF7A59]/5 cursor-pointer touch-manipulation min-h-[44px]"
            >
              <svg className="h-4 w-4 flex-shrink-0 text-[#FF7A59]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="max-w-[280px] truncate">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors.

- [ ] **Step 3: 提交**

```bash
git add components/chat/WelcomeCard.tsx
git commit -m "feat: replace emoji icons with ExpertAvatar and SVG in WelcomeCard"
```

---

### Task 3: 改进 ExpertSwitchPanel — 图标替换 + 响应式

**文件：**
- 修改: `components/chat/ExpertSwitchPanel.tsx`

- [ ] **Step 1: 替换专家头像为 ExpertAvatar，添加响应式样式**

修改 `components/chat/ExpertSwitchPanel.tsx`：

关键改动：
1. 引入 `ExpertAvatar`，替换 emoji 圆形头像
2. 面板添加 `max-h-[80vh] overflow-y-auto`、`mx-2 p-6 sm:p-8`、`rounded-[24px] sm:rounded-[32px]`
3. 专家按钮添加 `min-h-[44px]`、`cursor-pointer`

```typescript
// components/chat/ExpertSwitchPanel.tsx
// （只显示改动部分，其余保持不变）

import { ExpertAvatar } from './ExpertAvatar';

// ... 在 JSX 中替换专家头像：
// 原来：
// <span
//   className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl"
//   style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
// >
//   {meta.emoji}
// </span>

// 改为：
<ExpertAvatar expert={id} size="sm" />

// 面板卡片容器改为：
<motion.div
  ref={panelRef}
  className="mx-2 w-full max-w-lg rounded-[24px] sm:rounded-[32px] bg-white p-6 sm:p-8 shadow-soft max-h-[80vh] overflow-y-auto"
  // ...
>

// 专家按钮添加 cursor-pointer：
className={`flex w-full items-center gap-4 rounded-[20px] border-2 p-4 text-left transition-all min-h-[44px] cursor-pointer touch-manipulation ${
  isActive
    ? 'border-[#FF7A59] bg-[#FF7A59]/5'
    : isLocked
      ? 'border-transparent bg-gray-100 opacity-50 cursor-not-allowed'
      : 'border-transparent bg-[#FAF7F2] hover:bg-gray-100'
}`}

// 关闭按钮添加 min-h-[44px] 和 cursor-pointer：
<button
  type="button"
  onClick={onClose}
  className="mt-6 w-full rounded-[16px] border border-gray-200 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-50 cursor-pointer touch-manipulation min-h-[44px]"
>
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add components/chat/ExpertSwitchPanel.tsx
git commit -m "feat: replace emoji with ExpertAvatar and add responsive styles in ExpertSwitchPanel"
```

---

### Task 4: 改进 MessageBubble — 响应式气泡宽度/字体

**文件：**
- 修改: `components/chat/MessageBubble.tsx`

- [ ] **Step 1: 添加响应式 max-w、字体和间距**

修改 `components/chat/MessageBubble.tsx` 中的气泡容器 className：

```typescript
// 用户消息容器：
<div
  className={`rounded-[18px] px-4 py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3 text-[15px] lg:text-sm leading-relaxed ${
    isUser
      ? 'max-w-[85%] md:max-w-[75%] lg:max-w-[65%] bg-[#FF7A59]/10 text-text-primary'
      : 'max-w-[92%] md:max-w-[85%] lg:max-w-[75%] border border-gray-100 bg-white text-text-primary shadow-soft prose prose-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-a:text-[#FF7A59]'
  }`}
>

// 消息间距从 mb-4 改为：
<div className={`flex mb-3 lg:mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add components/chat/MessageBubble.tsx
git commit -m "feat: add responsive message bubble width, font size, and spacing"
```

---

### Task 5: 改进 ChatInput — 触摸目标 + iOS 适配 + 响应式

**文件：**
- 修改: `components/chat/ChatInput.tsx`

- [ ] **Step 1: 增大按钮触摸目标，添加 iOS 安全区适配，响应式样式**

修改 `components/chat/ChatInput.tsx`：

```typescript
// 容器添加 iOS 底部安全区
<div className="border-t border-gray-100 bg-white px-3 sm:px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">

// 表单添加响应式圆角、gap、防止下拉刷新
<form
  onSubmit={handleSubmit}
  className="flex items-end gap-2 sm:gap-3 rounded-[14px] sm:rounded-[18px] bg-[#FAF7F2] px-3 sm:px-4 py-2.5 sm:py-3"
>

// textarea 添加 touch-manipulation、leading-relaxed、16px 字体防 iOS 缩放
<textarea
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder={t('inputPlaceholder')}
  rows={1}
  className="flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-text-primary placeholder-gray-400 outline-none touch-manipulation"
  style={{ maxHeight: '120px' }}
  onInput={(e) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  }}
/>

// 停止按钮增大至 44x44
<button
  type="button"
  onClick={onStop}
  className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 cursor-pointer touch-manipulation"
  aria-label="Stop generating"
>

// 发送按钮增大至 44x44
<button
  type="submit"
  disabled={disabled || !input.trim()}
  className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full bg-[#FF7A59] text-white transition-colors hover:bg-[#FF7A59]/90 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer touch-manipulation"
  aria-label={t('send')}
>
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add components/chat/ChatInput.tsx
git commit -m "feat: improve ChatInput touch targets, iOS safe area, and responsive styles"
```

---

### Task 6: 改进 ChatSidebar — 删除按钮 + Plus 图标 + 响应式

**文件：**
- 修改: `components/chat/ChatSidebar.tsx`

- [ ] **Step 1: 替换新建按钮图标、桌面端加宽、删除按钮移动端可见、drawer 宽度限制**

修改 `components/chat/ChatSidebar.tsx`：

```typescript
// 侧边栏容器宽度：w-72 lg:w-80
<aside className="flex h-full w-72 lg:w-80 flex-shrink-0 flex-col border-r border-gray-100 bg-white">

// 新建按钮：+ → Plus SVG 图标，添加 min-h-[44px]
<Link
  href={`/${lang}/chat/liam`}
  onClick={onClose}
  className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#FF7A59] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#FF7A59]/90 cursor-pointer touch-manipulation min-h-[44px]"
>
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
  </svg>
  {t('newChat')}
</Link>

// 对话列表按钮添加 cursor-pointer 和 touch-manipulation
<button
  type="button"
  onClick={() => {
    router.push(`/${lang}/chat/${expert}?c=${conv.id}`);
    onClose?.();
  }}
  className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 pr-10 text-left transition-colors hover:bg-gray-50 cursor-pointer touch-manipulation"
>

// 删除按钮：移动端始终可见，桌面端 hover 显示
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    handleDelete(conv.id);
  }}
  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] p-1.5 text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
  aria-label="Delete conversation"
>

// 移动端 drawer 宽度限制
<div className="absolute inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] animate-slide-in-left">
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add components/chat/ChatSidebar.tsx
git commit -m "feat: improve ChatSidebar with SVG icon, responsive widths, and visible delete on mobile"
```

---

### Task 7: 改进 ChatHeader — 触摸目标 + cursor-pointer

**文件：**
- 修改: `components/chat/ChatHeader.tsx`

- [ ] **Step 1: 添加 cursor-pointer、touch-manipulation、最小触摸尺寸**

修改 `components/chat/ChatHeader.tsx`：

```typescript
// 汉堡菜单按钮 — 添加 touch-manipulation、光标、最小尺寸
<button
  type="button"
  onClick={onToggleSidebar}
  className="rounded-[8px] p-2 text-[#777777] transition-colors hover:bg-gray-100 lg:hidden cursor-pointer touch-manipulation min-h-[44px] min-w-[44px]"
  aria-label="Open sidebar menu"
>

// 专家切换按钮 — 添加 cursor-pointer、touch-manipulation
<button
  type="button"
  onClick={onOpenExpertPanel}
  disabled={disabled}
  className="flex items-center gap-2 rounded-[14px] border border-gray-200 bg-[#FAF7F2] px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer touch-manipulation min-h-[44px] lg:px-4"
>
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add components/chat/ChatHeader.tsx
git commit -m "feat: improve ChatHeader touch targets and interaction hints"
```

---

### Task 8: 改进 MessageList — 新消息按钮 cursor-pointer

**文件：**
- 修改: `components/chat/MessageList.tsx`

- [ ] **Step 1: 新消息按钮添加 cursor-pointer**

`components/chat/MessageList.tsx` 中的新消息浮动按钮，添加 `cursor-pointer`：

```typescript
// 新消息浮动按钮
{hasNewMessage && (
  <button
    type="button"
    onClick={scrollToBottom}
    className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-[#FF7A59] px-4 py-2 text-xs font-medium text-white shadow-lg transition-all hover:bg-[#FF7A59]/90 cursor-pointer touch-manipulation"
  >
    // ... 图标和文字不变
  </button>
)}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add components/chat/MessageList.tsx
git commit -m "feat: add cursor-pointer to new message button in MessageList"
```

---

### Task 9: 端到端验证

- [ ] **Step 1: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1
```
Expected: No errors.

- [ ] **Step 2: 运行测试**

```bash
npm test 2>&1
```
Expected: All tests pass.

- [ ] **Step 3: 构建检查**

```bash
npm run build 2>&1 | tail -20
```
Expected: Build succeeds without errors.

- [ ] **Step 4: 多分辨率视觉检查**

启动 dev server 后用 Playwright 在不同分辨率下验证：

```bash
npm run dev &
```

在 375px、768px、1024px、1440px 四个断点检查：
- 消息气泡宽度和字体
- 触摸目标尺寸
- 侧边栏行为
- 专家面板
- 无横向滚动

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: final verification and cleanup for chat UI/UX improvements"
```

---

## 依赖关系

```
Task 1 (ExpertAvatar) ──┬──> Task 2 (WelcomeCard)
                        └──> Task 3 (ExpertSwitchPanel)

Task 4 (MessageBubble) — 独立
Task 5 (ChatInput) — 独立
Task 6 (ChatSidebar) — 独立
Task 7 (ChatHeader) — 独立
Task 8 (MessageList) — 独立

All tasks -> Task 9 (验证)
```
