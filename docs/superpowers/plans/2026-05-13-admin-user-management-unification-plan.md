# 后台管理系统：用户体系统一 & 跳转修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 合并后台用户管理三页为统一页面，管理员可编辑用户身份/密码/日限额，修复管理员无限跳转问题，Ultra 日限额改为 10000。

**Architecture:** 在现有 Next.js 16 App Router + Drizzle ORM + Better Auth 架构上渐进重构。复用 DataTable 组件和 AdminGuard 权限系统，扩展 GET/PATCH API 支持新字段，profiles 表新增 daily_limit 列，旧页面直接删除。

**Tech Stack:** Next.js 16, TypeScript 6, Drizzle ORM, PostgreSQL, Better Auth, Tailwind CSS 4

---

### Task 1: 数据库 — profiles 表新增 daily_limit 列

**Files:**
- Create: `lib/db/migrations/0006_add_daily_limit.sql`
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/migrations/meta/_journal.json`

- [ ] **Step 1: 创建 migration SQL 文件**

写入 `lib/db/migrations/0006_add_daily_limit.sql`：

```sql
ALTER TABLE "profiles" ADD COLUMN "daily_limit" integer;
```

- [ ] **Step 2: 更新 Drizzle Schema 定义**

在 `lib/db/schema.ts` 的 `profiles` 表定义中，`trialUsed` 行之后添加：

```typescript
dailyLimit: integer('daily_limit'),
```

找到 `profiles` 表定义（约第 109-119 行），`trialUsed: integer('trial_used').default(0)` 之后插入：

```typescript
dailyLimit: integer('daily_limit'),
```

- [ ] **Step 3: 更新 migration journal**

在 `lib/db/migrations/meta/_journal.json` 的 `entries` 数组末尾添加：

```json
{
  "idx": 6,
  "version": "7",
  "when": 1747152000000,
  "tag": "0006_add_daily_limit",
  "breakpoints": true
}
```

- [ ] **Step 4: 执行 migration**

```bash
cd /home/ml/project/ai/mvp/star1-relation && sudo -u postgres psql -d lunara -f lib/db/migrations/0006_add_daily_limit.sql
```

Expected: `ALTER TABLE` 成功

- [ ] **Step 5: 提交**

```bash
git add lib/db/schema.ts lib/db/migrations/0006_add_daily_limit.sql lib/db/migrations/meta/_journal.json
git commit -m "feat: profiles 表新增 daily_limit 列，支持按用户配置日限额"
```

---

### Task 2: Ultra 日限额 + 定价页更新

**Files:**
- Modify: `lib/subscription/gate.ts`
- Modify: `components/pricing/PricingSection.tsx`

- [ ] **Step 1: 修改 Ultra 日限额和 daily_limit 检查逻辑**

在 `lib/subscription/gate.ts` 第 13 行，修改 `DAILY_LIMITS`：

```typescript
const DAILY_LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  ultra: 10000,
};
```

同时在 `checkSubscriptionGate` 函数的日限额检查部分（约第 145-170 行），在计算 `limit` 后增加 daily_limit 覆盖逻辑。将以下代码：

```typescript
const limit = DAILY_LIMITS[variant];
if ((result?.count || 0) >= limit) {
```

改为：

```typescript
// 用户自定义日限额优先，否则使用方案默认值
const planLimit = DAILY_LIMITS[variant];
const [profile] = await db
  .select({ dailyLimit: schema.profiles.dailyLimit })
  .from(schema.profiles)
  .where(eq(schema.profiles.userId, userId));
const limit = profile?.dailyLimit ?? planLimit;
if (limit !== null && (result?.count || 0) >= limit) {
```

- [ ] **Step 2: 更新定价页 Ultra 描述**

在 `components/pricing/PricingSection.tsx` 第 71 行，将：

```typescript
tp('features.unlimitedMessages'),
```

改为：

```typescript
tp('features.dailyMessages', { count: 10000 }),
```

- [ ] **Step 3: 提交**

```bash
git add lib/subscription/gate.ts components/pricing/PricingSection.tsx
git commit -m "feat: Ultra 日限额改为 10000 条/天，支持按用户自定义日限额"
```

---

### Task 3: 管理员跳转修复

**Files:**
- Modify: `components/admin/AdminRedirect.tsx`
- Modify: `components/common/NavbarClient.tsx`

- [ ] **Step 1: AdminRedirect 增加 sessionStorage 检查**

将 `components/admin/AdminRedirect.tsx` 内容替换为：

```tsx
'use client';
// components/admin/AdminRedirect.tsx
// 登录后检测是否为管理员，是则自动跳转到 /admin 管理后台（仅一次）

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REDIRECT_KEY = 'admin_redirected';

export default function AdminRedirect({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) return;
    // 检查 sessionStorage 标记，已跳转过则不再跳转
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(REDIRECT_KEY) === '1') {
      return;
    }
    window.sessionStorage.setItem(REDIRECT_KEY, '1');
    router.replace('/admin');
  }, [isAdmin, router]);

  return null;
}
```

- [ ] **Step 2: NavbarClient 登出时清除跳转标记**

在 `components/common/NavbarClient.tsx` 的 `handleLogout` 函数中（约第 133-141 行），`window.location.href` 之前增加清除操作：

```typescript
const handleLogout = async () => {
  try {
    await authClient.signOut();
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    window.sessionStorage.removeItem('admin_redirected');
    window.location.href = `/${lang}`;
  }
};
```

- [ ] **Step 3: 提交**

```bash
git add components/admin/AdminRedirect.tsx components/common/NavbarClient.tsx
git commit -m "fix: 管理员登录后仅跳转一次后台，使用 sessionStorage 标记"
```

---

### Task 4: API — 扩展 GET /api/admin/users 支持统一列表

**Files:**
- Modify: `lib/stats/query.ts`
- Modify: `app/api/admin/users/route.ts`

- [ ] **Step 1: 扩展 queryUsers 查询函数**

在 `lib/stats/query.ts` 中，修改 `UserListParams` 接口和 `queryUsers` 函数。

将 `UserListParams` 接口（第 203-207 行）改为：

```typescript
export interface UserListParams {
  search?: string;
  variant?: string;  // 新增：按会员身份筛选
  page: number;
  pageSize: number;
}
```

将 `UserRow` 接口（第 209-217 行）改为：

```typescript
export interface UserRow {
  id: string;
  name: string;
  email: string;
  variantName: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  dailyLimit: number | null;
  messageCount: number;
  createdAt: string;
}
```

将 `queryUsers` 函数（第 219-248 行）替换为：

```typescript
export async function queryUsers(params: UserListParams): Promise<{ users: UserRow[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;

  const conditions = [sql`1=1`];

  if (params.search) {
    conditions.push(sql`AND (u.name ILIKE ${'%' + params.search + '%'} OR u.email ILIKE ${'%' + params.search + '%'})`);
  }

  if (params.variant) {
    if (params.variant === 'free') {
      // free 用户：无活跃订阅记录
      conditions.push(sql`AND (s.id IS NULL OR s.status != 'active')`);
    } else {
      conditions.push(sql`AND s.status = 'active' AND s.variant_name = ${params.variant}`);
    }
  }

  const whereClause = sql.join(conditions, sql` `);

  const countResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM "user" u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        WHERE ${whereClause}`
  );

  const result = await db.execute(
    sql`SELECT
          u.id, u.name, u.email, u.created_at as "createdAt",
          s.variant_name as "variantName", s.status as "subscriptionStatus",
          s.current_period_end as "currentPeriodEnd",
          p.daily_limit as "dailyLimit",
          COALESCE(m.msg_count, 0)::int as "messageCount"
        FROM "user" u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN (
          SELECT c.user_id, COUNT(*) as msg_count
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          GROUP BY c.user_id
        ) m ON m.user_id = u.id
        WHERE ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ${params.pageSize} OFFSET ${offset}`
  );

  return { users: result.rows as unknown as UserRow[], total: countResult.rows[0]?.count ?? 0 };
}
```

- [ ] **Step 2: 更新 GET API 路由支持 variant 参数**

将 `app/api/admin/users/route.ts` 替换为：

```typescript
// app/api/admin/users/route.ts
// GET /api/admin/users — 统一用户列表（搜索/身份筛选/分页）

import { getAdminUserId } from '@/lib/admin/guard';
import { queryUsers } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const variant = searchParams.get('variant') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    const data = await queryUsers({ search, variant: variant || undefined, page, pageSize });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AdminUsers] 获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add lib/stats/query.ts app/api/admin/users/route.ts
git commit -m "feat: GET /api/admin/users 扩展关联订阅+日限额，支持身份筛选"
```

---

### Task 5: API — 扩展 GET/PATCH /api/admin/users/[id] 支持详情和编辑

**Files:**
- Modify: `app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: 扩展 GET 返回 daily_limit**

在 `app/api/admin/users/[id]/route.ts` 的 GET 处理函数中，现有查询 user 和 subscription 之后，增加查询 profiles：

```typescript
// 查询 daily_limit
const [profile] = await db
  .select({ dailyLimit: schema.profiles.dailyLimit })
  .from(schema.profiles)
  .where(eq(schema.profiles.userId, id));
```

然后在返回 JSON 中增加：

```typescript
dailyLimit: profile?.dailyLimit ?? null,
```

最终 GET 返回的完整 JSON：

```typescript
return NextResponse.json({
  id: u.id,
  name: u.name,
  email: u.email,
  image: u.image,
  createdAt: u.createdAt,
  subscription: sub[0] ?? null,
  dailyLimit: profile?.dailyLimit ?? null,
  messageCount,
});
```

- [ ] **Step 2: 重写 PATCH 支持编辑全部字段**

将 PATCH 处理函数替换为：

```typescript
// PATCH: 编辑用户（姓名/邮箱/密码/会员身份/到期时间/日限额）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name, email, password, variantName, currentPeriodEnd, dailyLimit } = body;

  try {
    // 1. 更新基本字段（name/email）
    if (name || email) {
      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      await db.update(schema.user).set(updateData).where(eq(schema.user.id, id));
    }

    // 2. 更新密码（使用 Better Auth 内置 hashPassword）
    if (password) {
      const { hashPassword } = await import('better-auth/crypto');
      const hashedPassword = await hashPassword(password);
      const [account] = await db
        .select()
        .from(schema.account)
        .where(and(eq(schema.account.userId, id), eq(schema.account.providerId, 'credential')));
      if (account) {
        await db
          .update(schema.account)
          .set({ password: hashedPassword })
          .where(eq(schema.account.id, account.id));
      }
    }

    // 3. 更新会员身份
    if (variantName !== undefined) {
      const existingSub = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, id))
        .limit(1);

      if (variantName === 'free' || variantName === '' || variantName === null) {
        // 改为 free：取消现有订阅
        if (existingSub.length > 0 && existingSub[0].status === 'active') {
          await db
            .update(schema.subscriptions)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(schema.subscriptions.id, existingSub[0].id));
        }
      } else {
        // 改为付费身份
        if (existingSub.length > 0 && existingSub[0].status === 'active') {
          // 已有活跃订阅 → 更新方案和到期时间
          await db
            .update(schema.subscriptions)
            .set({
              variantName,
              currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
              updatedAt: new Date(),
            })
            .where(eq(schema.subscriptions.id, existingSub[0].id));
        } else {
          // 无活跃订阅 → 创建手动订阅记录
          const adminId = typeof auth === 'string' ? auth : 'admin';
          await db.insert(schema.subscriptions).values({
            userId: id,
            paypalSubscriptionId: `manual_${adminId}_${Date.now()}`,
            paypalPlanId: `manual_${variantName}`,
            variantName,
            status: 'active',
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
          });
        }
      }
    } else if (currentPeriodEnd !== undefined) {
      // 仅更新到期时间（不改变身份）
      const existingSub = await db
        .select()
        .from(schema.subscriptions)
        .where(and(eq(schema.subscriptions.userId, id), eq(schema.subscriptions.status, 'active')))
        .limit(1);
      if (existingSub.length > 0) {
        await db
          .update(schema.subscriptions)
          .set({
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.id, existingSub[0].id));
      }
    }

    // 4. 更新日限额
    if (dailyLimit !== undefined) {
      await db
        .insert(schema.profiles)
        .values({ userId: id, dailyLimit })
        .onConflictDoUpdate({ target: schema.profiles.userId, set: { dailyLimit } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminUsers] 编辑用户失败:', error);
    return NextResponse.json({ error: '编辑用户失败' }, { status: 500 });
  }
}
```

- [ ] **Step 3: 确认 import 完整性**

在文件顶部确认已导入所需的 Drizzle 操作符：

```typescript
import { getAdminUserId } from '@/lib/admin/guard';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
```

- [ ] **Step 4: 提交**

```bash
git add app/api/admin/users/\[id\]/route.ts
git commit -m "feat: PATCH /api/admin/users/:id 支持编辑密码/身份/到期/日限额"
```

---

### Task 6: 统一用户列表页（前端）

**Files:**
- Modify: `app/admin/users/page.tsx`
- Modify: `components/admin/users/UserTable.tsx`

- [ ] **Step 1: 重写 UserTable 组件以匹配新列**

将 `components/admin/users/UserTable.tsx` 替换为：

```tsx
'use client';
// components/admin/users/UserTable.tsx
// 统一用户列表表格组件

import { useState } from 'react';
import DataTable, { Column } from '@/components/admin/shared/DataTable';

export interface UnifiedUserRow {
  id: string;
  name: string;
  email: string;
  variantName: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  dailyLimit: number | null;
  messageCount: number;
  createdAt: string;
}

const DEFAULT_DAILY_LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  ultra: 10000,
};

const VARIANT_COLORS: Record<string, string> = {
  free: 'bg-gray-50 text-gray-600',
  starter: 'bg-blue-50 text-blue-700',
  pro: 'bg-purple-50 text-purple-700',
  ultra: 'bg-amber-50 text-amber-700',
  admin: 'bg-red-50 text-red-700',
};

const columns: Column<UnifiedUserRow>[] = [
  { key: 'name', header: '用户名' },
  { key: 'email', header: '邮箱' },
  {
    key: 'variantName',
    header: '会员身份',
    render: (row) => {
      const variant = row.variantName && row.subscriptionStatus === 'active' ? row.variantName : 'free';
      return (
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${VARIANT_COLORS[variant] || VARIANT_COLORS.free}`}>
          {variant}
        </span>
      );
    },
  },
  {
    key: 'currentPeriodEnd',
    header: '到期时间',
    render: (row) => {
      if (!row.currentPeriodEnd || row.subscriptionStatus !== 'active') return '-';
      return new Date(row.currentPeriodEnd).toLocaleDateString('zh-CN');
    },
  },
  {
    key: 'dailyLimit',
    header: '日限额',
    render: (row) => {
      if (row.dailyLimit !== null) return String(row.dailyLimit);
      const variant = row.variantName && row.subscriptionStatus === 'active' ? row.variantName : '';
      return variant ? String(DEFAULT_DAILY_LIMITS[variant] ?? '-') : '-';
    },
  },
  {
    key: 'createdAt',
    header: '注册时间',
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
];

interface UserTableProps {
  data: UnifiedUserRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onSearch: (s: string) => void;
  onPageChange: (p: number) => void;
  onRowClick: (row: UnifiedUserRow) => void;
}

export default function UserTable({ data, total, page, pageSize, isLoading, onSearch, onPageChange, onRowClick }: UserTableProps) {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = () => {
    onSearch(searchInput);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
          placeholder="搜索用户名或邮箱..."
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={handleSearchSubmit}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          搜索
        </button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={onPageChange}
        onRowClick={onRowClick}
      />
    </div>
  );
}
```

- [ ] **Step 2: 重写列表页支持身份筛选**

将 `app/admin/users/page.tsx` 替换为：

```tsx
'use client';
// app/admin/users/page.tsx
// 统一用户管理列表页 — 展示所有用户，支持身份筛选、搜索和分页

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import UserTable, { UnifiedUserRow } from '@/components/admin/users/UserTable';

const VARIANTS = [
  { label: '全部', value: '' },
  { label: 'Free', value: 'free' },
  { label: 'Starter', value: 'starter' },
  { label: 'Pro', value: 'pro' },
  { label: 'Ultra', value: 'ultra' },
  { label: 'Admin', value: 'admin' },
];

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<{ users: UnifiedUserRow[]; total: number }>({ users: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [variant, setVariant] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (variant) params.set('variant', variant);
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, search, variant]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {VARIANTS.map((v) => (
          <button
            key={v.value}
            onClick={() => { setVariant(v.value); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              variant === v.value
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <UserTable
        data={data.users}
        total={data.total}
        page={page}
        pageSize={20}
        isLoading={loading}
        onSearch={(s) => { setSearch(s); setPage(1); }}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add app/admin/users/page.tsx components/admin/users/UserTable.tsx
git commit -m "feat: 统一用户列表页，合并会员/订阅数据，支持身份筛选"
```

---

### Task 7: 用户详情页增强编辑功能

**Files:**
- Modify: `app/admin/users/[id]/page.tsx`

- [ ] **Step 1: 重写用户详情页**

将 `app/admin/users/[id]/page.tsx` 替换为：

```tsx
'use client';
// app/admin/users/[id]/page.tsx
// 用户详情页 — 查看/编辑用户完整信息：基本资料、密码、会员身份、到期时间、日限额

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/admin/shared/ConfirmDialog';

interface UserDetailData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  subscription: {
    id: string;
    variantName: string;
    status: string;
    currentPeriodEnd: string | null;
    paypalSubscriptionId: string;
  } | null;
  dailyLimit: number | null;
  messageCount: number;
}

interface EditableForm {
  name: string;
  email: string;
  password: string;
  variantName: string;
  currentPeriodEnd: string;
  dailyLimit: string;
}

const VARIANTS = [
  { label: 'Free', value: 'free' },
  { label: 'Starter', value: 'starter' },
  { label: 'Pro', value: 'pro' },
  { label: 'Ultra', value: 'ultra' },
  { label: 'Admin', value: 'admin' },
];

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [form, setForm] = useState<EditableForm>({
    name: '',
    email: '',
    password: '',
    variantName: 'free',
    currentPeriodEnd: '',
    dailyLimit: '',
  });

  const loadUser = () => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setForm({
          name: data.name,
          email: data.email,
          password: '',
          variantName: data.subscription?.variantName && data.subscription?.status === 'active'
            ? data.subscription.variantName : 'free',
          currentPeriodEnd: data.subscription?.currentPeriodEnd
            ? new Date(data.subscription.currentPeriodEnd).toISOString().split('T')[0]
            : '',
          dailyLimit: data.dailyLimit !== null ? String(data.dailyLimit) : '',
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          variantName: form.variantName,
          currentPeriodEnd: form.currentPeriodEnd || undefined,
          dailyLimit: form.dailyLimit ? parseInt(form.dailyLimit, 10) : null,
        }),
      });
      setEditing(false);
      setForm((prev) => ({ ...prev, password: '' }));
      loadUser();
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    router.push('/admin/users');
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!user) return <div className="p-6 text-gray-400">用户不存在</div>;

  const currentVariant = user.subscription?.variantName && user.subscription?.status === 'active'
    ? user.subscription.variantName : 'free';

  const isFree = form.variantName === 'free' || form.variantName === '';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-800">用户详情</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* 操作按钮 */}
        <div className="flex justify-between">
          <h2 className="text-lg font-semibold">基本信息</h2>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-sm border rounded-lg"
                >
                  取消
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm border rounded-lg">
                编辑
              </button>
            )}
          </div>
        </div>

        {/* 字段表单 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* 姓名 */}
          <div>
            <span className="text-gray-400">姓名</span>
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="block mt-1 px-2 py-1 border rounded w-full"
              />
            ) : (
              <p className="mt-1 font-medium">{user.name}</p>
            )}
          </div>

          {/* 邮箱 */}
          <div>
            <span className="text-gray-400">邮箱</span>
            {editing ? (
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="block mt-1 px-2 py-1 border rounded w-full"
              />
            ) : (
              <p className="mt-1 font-medium">{user.email}</p>
            )}
          </div>

          {/* 密码 — 仅编辑模式 */}
          {editing && (
            <div>
              <span className="text-gray-400">新密码</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="留空不修改"
                className="block mt-1 px-2 py-1 border rounded w-full"
              />
            </div>
          )}

          {/* 会员身份 */}
          <div>
            <span className="text-gray-400">会员身份</span>
            {editing ? (
              <select
                value={form.variantName}
                onChange={(e) => setForm({ ...form, variantName: e.target.value })}
                className="block mt-1 px-2 py-1 border rounded w-full"
              >
                {VARIANTS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            ) : (
              <p className="mt-1 font-medium capitalize">{currentVariant}</p>
            )}
          </div>

          {/* 到期时间 */}
          <div>
            <span className="text-gray-400">到期时间</span>
            {editing ? (
              <input
                type="date"
                value={form.currentPeriodEnd}
                onChange={(e) => setForm({ ...form, currentPeriodEnd: e.target.value })}
                disabled={isFree}
                className="block mt-1 px-2 py-1 border rounded w-full disabled:opacity-30"
              />
            ) : (
              <p className="mt-1 font-medium">
                {user.subscription?.currentPeriodEnd
                  ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString('zh-CN')
                  : '-'}
              </p>
            )}
          </div>

          {/* 日限额 */}
          <div>
            <span className="text-gray-400">日限额（留空使用方案默认值）</span>
            {editing ? (
              <input
                type="number"
                value={form.dailyLimit}
                onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })}
                placeholder="使用方案默认值"
                className="block mt-1 px-2 py-1 border rounded w-full"
              />
            ) : (
              <p className="mt-1 font-medium">
                {user.dailyLimit !== null ? user.dailyLimit : '默认'}
              </p>
            )}
          </div>

          {/* 只读字段 */}
          <div>
            <span className="text-gray-400">注册时间</span>
            <p className="mt-1 font-medium">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</p>
          </div>
          <div>
            <span className="text-gray-400">消息数</span>
            <p className="mt-1 font-medium">{user.messageCount}</p>
          </div>
        </div>

        {/* 删除按钮 */}
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            删除用户
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="确认删除"
        message={`确定要删除用户 "${user.name}" 吗？此操作将删除该用户的所有对话、消息和订阅数据，不可撤销。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/admin/users/\[id\]/page.tsx
git commit -m "feat: 用户详情页支持编辑密码/会员身份/到期时间/日限额"
```

---

### Task 8: 侧边栏导航清理 + 旧页面删除

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`
- Delete: `app/admin/members/page.tsx`
- Delete: `app/admin/members/[id]/page.tsx`
- Delete: `app/admin/subscriptions/page.tsx`
- Delete: `app/admin/subscriptions/[id]/page.tsx`
- Delete: `app/api/admin/members/route.ts`
- Delete: `app/api/admin/members/[id]/route.ts`
- Delete: `app/api/admin/subscriptions/route.ts`
- Delete: `app/api/admin/subscriptions/[id]/route.ts`
- Delete: `app/api/admin/subscriptions/[id]/history/route.ts`

- [ ] **Step 1: 更新侧边栏导航**

在 `components/admin/AdminSidebar.tsx` 中，修改 `navGroups` 数组，将「用户体系」分组改为单项：

```typescript
const navGroups: NavGroup[] = [
  {
    label: '数据概览',
    items: [{ href: '/admin/dashboard', label: '仪表盘' }],
  },
  {
    label: '用户体系',
    items: [
      { href: '/admin/users', label: '用户管理' },
    ],
  },
  {
    label: '数据分析',
    items: [
      { href: '/admin/stats/project', label: '项目统计' },
      { href: '/admin/stats/traffic', label: '流量统计' },
    ],
  },
];
```

- [ ] **Step 2: 删除旧页面和 API 文件**

```bash
cd /home/ml/project/ai/mvp/star1-relation
rm -rf app/admin/members
rm -rf app/admin/subscriptions
rm -f app/api/admin/members/route.ts
rm -f app/api/admin/members/\[id\]/route.ts
rm -f app/api/admin/subscriptions/route.ts
rm -f app/api/admin/subscriptions/\[id\]/route.ts
rm -f app/api/admin/subscriptions/\[id\]/history/route.ts
# 删除空的上级目录
rmdir app/api/admin/members/\[id\] 2>/dev/null || true
rmdir app/api/admin/members 2>/dev/null || true
rmdir app/api/admin/subscriptions/\[id\]/history 2>/dev/null || true
rmdir app/api/admin/subscriptions/\[id\] 2>/dev/null || true
rmdir app/api/admin/subscriptions 2>/dev/null || true
```

- [ ] **Step 3: 提交**

```bash
git add -A app/admin/members app/admin/subscriptions app/api/admin/members app/api/admin/subscriptions components/admin/AdminSidebar.tsx
git commit -m "feat: 移除独立的会员管理和订阅管理页面，统一到用户管理"
```

---

### Task 9: TypeScript 编译验证 + 构建检查

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit
```

Expected: 无类型错误（如有，根据错误信息修复后重新检查）

- [ ] **Step 2: 运行构建**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm run build
```

Expected: 构建成功，无错误

- [ ] **Step 3: 运行测试**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm test
```

Expected: 所有测试通过

- [ ] **Step 4: 提交（如有修复）**

```bash
git add -A
git commit -m "fix: TypeScript 类型检查和构建修复"
```

---

### Task 10: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm run dev &
```

- [ ] **Step 2: 验证管理员跳转**

1. 用管理员账号登录 → 应自动跳转至 `/admin`
2. 手动访问首页 `/zh` → 应正常显示首页，不再跳转
3. 关闭标签页重新打开 → 应再次跳转一次
4. 退出登录 → 标记清除
5. 重新登录 → 应再次跳转

- [ ] **Step 3: 验证用户管理列表**

1. 访问 `/admin/users` → 应显示统一用户表，含用户名/邮箱/会员身份/到期时间/日限额/注册时间
2. 点击「Free」筛选 → 仅显示未订阅用户
3. 点击「Starter/Pro/Ultra」筛选 → 按身份筛选
4. 搜索功能 → 按用户名/邮箱搜索
5. 分页 → 翻页正常

- [ ] **Step 4: 验证用户详情编辑**

1. 点击用户进入详情页
2. 编辑用户名 → 保存生效
3. 设置新密码 → 用新密码可登录
4. 切换会员身份 free → starter → 列表页显示 starter
5. 设置到期时间 → 保存生效
6. 设置日限额 → 保存生效
7. 删除用户 → 确认后删除

- [ ] **Step 5: 验证定价页**

1. 访问 `/zh/pricing` → Ultra 描述显示「每日 10000 条消息」而非「无限制」
