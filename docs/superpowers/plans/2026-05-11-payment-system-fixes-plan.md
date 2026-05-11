# 支付系统完善实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复支付系统 8 个缺陷：VariantMap 映射缺失、试用并发、webhook 事件不完整、rate limit 注释、redirect 硬编码、cron N+1、schema 缺失字段

**Architecture:** 按模块分组修改，从底层 lib → API 路由 → 前端组件，4 个独立 commit。每个模块完成后可独立验证。

**Tech Stack:** Next.js App Router, Drizzle ORM (PostgreSQL), TypeScript, LemonSqueezy API

---

## 文件结构

| 文件 | 职责 | 操作 |
|------|------|------|
| `lib/lemonsqueezy/index.ts` | Variant 映射 + Webhook 验证 | 修改 |
| `lib/lemonsqueezy/client.ts` | Checkout URL 创建 | 修改 |
| `lib/db/schema.ts` | 数据库表定义 | 修改 |
| `lib/db/migrations/` | 迁移 SQL | 新增 |
| `app/api/subscription/webhook/route.ts` | LS Webhook 事件处理 | 修改 |
| `app/api/subscription/checkout/route.ts` | Checkout API 端点 | 修改 |
| `app/api/chat/route.ts` | Chat SSE 流式 API | 修改 |
| `app/api/cron/cleanup/route.ts` | 消息清理 Cron Job | 修改 |
| `app/[lang]/chat/[expert]/page.tsx` | 聊天页客户端 | 修改 |
| `components/pricing/PricingSection.tsx` | 定价区（非修改范围） | — |
| `components/pricing/PricingCard.tsx` | 定价卡片（非修改范围） | — |

---

### Task 1: 扩展 VariantMap + redirect_url 参数化

**文件:**
- 修改: `lib/lemonsqueezy/index.ts`
- 修改: `lib/lemonsqueezy/client.ts`

- [ ] **Step 1: 在 initVariantMap 中增加 7 个 variant ID 映射**

编辑 `lib/lemonsqueezy/index.ts`，将 `initVariantMap` 函数中的 `pairs` 数组从 6 对扩展到 13 对：

```typescript
function initVariantMap() {
  const pairs: [string | undefined, VariantName][] = [
    // 国外（自动续费）
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY, 'starter'],
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY, 'starter'],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY, 'pro'],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY, 'pro'],
    [process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY, 'ultra'],
    [process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY, 'ultra'],
    // 国内（手动续费）
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC, 'starter'],
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC, 'starter'],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC, 'pro'],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC, 'pro'],
    [process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC, 'ultra'],
    [process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC, 'ultra'],
    // 测试方案
    [process.env.LEMONSQUEEZY_VARIANT_TEST, 'starter'],
  ];
  for (const [id, name] of pairs) {
    if (id) VARIANT_MAP[id] = name;
  }
}
```

- [ ] **Step 2: createCheckout 增加 redirectUrl 参数**

编辑 `lib/lemonsqueezy/client.ts`：

```typescript
/**
 * 创建 LemonSqueezy Checkout
 * @param variantId - LS 产品变体 ID
 * @param userId - 当前登录用户 ID
 * @param redirectUrl - 支付成功后重定向地址（可选，默认 /pricing）
 * @returns Checkout URL
 */
export async function createCheckout(
  variantId: string,
  userId: string,
  redirectUrl?: string,
): Promise<string> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          custom: { user_id: userId },
        },
        product_options: {
          redirect_url: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: variantId } },
      },
    },
  };

  const result = await lsRequest('/checkouts', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result.data.attributes.url;
}
```

（仅改动：第 10 行参数签名增加 `redirectUrl?: string`，第 25 行 redirect_url 变为 `redirectUrl || ...`）

- [ ] **Step 3: checkout API 路由传递 redirect_url**

编辑 `app/api/subscription/checkout/route.ts`：

```typescript
// lib/lemonsqueezy/client.ts 第 8 行 — POST handler 中 body 解构增加 redirect_url
let body: { variant_id?: string; redirect_url?: string };
try {
  body = await request.json();
} catch {
  return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
}

if (!body.variant_id || typeof body.variant_id !== 'string') {
  return Response.json({ error: 'variant_id is required' }, { status: 400 });
}

try {
  const url = await createCheckout(body.variant_id, session.user.id, body.redirect_url);
  return Response.json({ url });
} catch (err) {
  console.error('Checkout creation failed:', err);
  return Response.json({ error: 'Failed to create checkout' }, { status: 500 });
}
```

- [ ] **Step 4: TypeScript 编译检查**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 无新增类型错误

- [ ] **Step 5: Commit**

```bash
git add lib/lemonsqueezy/index.ts lib/lemonsqueezy/client.ts app/api/subscription/checkout/route.ts
git commit -m "fix: expand VariantMap to 13 IDs (domestic + test), add redirectUrl param to createCheckout"
```

---

### Task 2: Schema 增加追溯字段 + 数据库迁移

**文件:**
- 修改: `lib/db/schema.ts`
- 新增: `lib/db/migrations/0002_*.sql`（Drizzle Kit 自动生成）

- [ ] **Step 1: 修改 subscriptions 表定义**

编辑 `lib/db/schema.ts`，在 `subscriptions` 表中 `cancelAtPeriodEnd` 之前增加两个字段：

```typescript
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  lemonSqueezySubscriptionId: text('lemon_squeezy_subscription_id').notNull().unique(),
  lemonSqueezyVariantId: text('lemon_squeezy_variant_id').notNull(),
  variantName: text('variant_name').notNull(),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  lemonSqueezyCustomerId: text('lemon_squeezy_customer_id'),   // 新增
  lemonSqueezyOrderId: text('lemon_squeezy_order_id'),         // 新增
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

（在 `currentPeriodEnd` 之后、`cancelAtPeriodEnd` 之前插入两个 text 字段）

- [ ] **Step 2: 生成 Drizzle 迁移 SQL**

Run: `npx drizzle-kit generate`
Expected: 生成 `lib/db/migrations/0002_*.sql`，内容为 `ALTER TABLE subscriptions ADD COLUMN ...`

- [ ] **Step 3: 执行迁移**

Run: `npx drizzle-kit migrate`
Expected: 迁移成功执行，无错误

- [ ] **Step 4: TypeScript 编译检查**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: 无新增类型错误

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/
git commit -m "feat: add lemonSqueezyCustomerId and lemonSqueezyOrderId to subscriptions table"
```

---

### Task 3: Webhook 事件补全

**文件:**
- 修改: `app/api/subscription/webhook/route.ts`

- [ ] **Step 1: 扩展 LSEvent 接口，增加 customer_id / order_id 字段**

编辑 `app/api/subscription/webhook/route.ts`，修改 `LSEvent` 接口：

```typescript
interface LSEvent {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    attributes: {
      customer_id?: number;
      variant_id?: number;
      status?: string;
      renews_at?: string;
      created_at?: string;
      ends_at?: string;
      cancelled?: boolean;
      order_id?: number;         // 新增
      first_order_item?: {       // 新增：订阅的首个订单项
        order_id?: number;
      };
    };
  };
}
```

- [ ] **Step 2: 解析 customer_id 和 order_id**

修改变量解构部分，在 `const cancelled = ...` 之后增加：

```typescript
const cancelled = event.data.attributes.cancelled;
const customerId = event.data.attributes.customer_id;
const orderId = event.data.attributes.order_id
  || event.data.attributes.first_order_item?.order_id;
```

- [ ] **Step 3: subscription_created 写入新字段**

修改 `subscription_created` case 中 `db.insert` 的 values，增加 customerId 和 orderId：

```typescript
case 'subscription_created': {
  if (!userId || !variantName) break;
  await db.delete(schema.subscriptions).where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
  await db.insert(schema.subscriptions).values({
    userId,
    lemonSqueezySubscriptionId: subId,
    lemonSqueezyVariantId: variantId,
    variantName: variantName as 'starter' | 'pro' | 'ultra',
    status: status === 'active' ? 'active' : 'cancelled',
    currentPeriodStart: createdAt ? new Date(createdAt) : undefined,
    currentPeriodEnd: renewsAt ? new Date(renewsAt) : undefined,
    lemonSqueezyCustomerId: customerId ? String(customerId) : undefined,  // 新增
    lemonSqueezyOrderId: orderId ? String(orderId) : undefined,           // 新增
  });
  break;
}
```

- [ ] **Step 4: subscription_updated 增加 variant 更新**

修改 `subscription_updated` case，增加 variantId 和 variantName 的更新逻辑：

```typescript
case 'subscription_updated': {
  const updates: Record<string, any> = {};
  if (status) updates.status = status === 'active' ? 'active' : status === 'cancelled' ? 'cancelled' : 'expired';
  if (renewsAt) updates.currentPeriodEnd = new Date(renewsAt);
  if (cancelled !== undefined) updates.cancelAtPeriodEnd = cancelled;
  // 升级/降级时更新 variant
  if (variantId) {
    updates.lemonSqueezyVariantId = variantId;
    if (variantName) updates.variantName = variantName;
  }
  updates.updatedAt = new Date();

  await db
    .update(schema.subscriptions)
    .set(updates)
    .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
  break;
}
```

- [ ] **Step 5: 新增 subscription_payment_failed 事件**

在 `subscription_cancelled` case 之后增加：

```typescript
case 'subscription_payment_failed': {
  await db
    .update(schema.subscriptions)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
  console.error('[LS Webhook] Payment failed:', { subId, userId, variantName });
  break;
}
```

- [ ] **Step 6: 新增 subscription_expired 事件**

在 `subscription_payment_failed` case 之后增加：

```typescript
case 'subscription_expired': {
  await db
    .update(schema.subscriptions)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
  console.log('[LS Webhook] Subscription expired:', { subId, userId, variantName });
  break;
}
```

- [ ] **Step 7: TypeScript 编译检查**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: 无类型错误

- [ ] **Step 8: Commit**

```bash
git add app/api/subscription/webhook/route.ts
git commit -m "fix: add webhook handlers for variant upgrade, payment_failed, expired events; write customerId/orderId"
```

---

### Task 4: Chat Route 原子化试用计数

**文件:**
- 修改: `app/api/chat/route.ts`

- [ ] **Step 1: 移除旧的 trial 查询 + 判断逻辑**

在 `app/api/chat/route.ts` 中，删除 `// ---------- 订阅门控：检查试用剩余 ----------` 注释块下的 `profile` 查询和判断代码（当前第 36-56 行），替换为事务原子操作。

**删除原代码：**
```typescript
// 删除以下行
// ---------- 订阅门控：检查试用剩余 ----------
const [profile] = await db
  .select({ trialUsed: schema.profiles.trialUsed })
  .from(schema.profiles)
  .where(eq(schema.profiles.userId, session.user.id));

const trialUsed = profile?.trialUsed || 0;

const [subscription] = await db
  .select({ variant: schema.subscriptions.variantName, status: schema.subscriptions.status })
  .from(schema.subscriptions)
  .where(eq(schema.subscriptions.userId, session.user.id));

const isSubscribed = subscription && subscription.status === 'active';
const variant = subscription?.variant || null;

if (!isSubscribed && trialUsed >= 3) {
  return Response.json({
    error: 'Trial exhausted',
    code: 'TRIAL_EXHAUSTED',
  }, { status: 402 });
}
```

**替换为：**
```typescript
// ---------- 订阅门控：事务原子 trial 检查 + 订阅查询 ----------
const [subscription] = await db
  .select({ variant: schema.subscriptions.variantName, status: schema.subscriptions.status })
  .from(schema.subscriptions)
  .where(eq(schema.subscriptions.userId, session.user.id));

const isSubscribed = subscription && subscription.status === 'active';
const variant = subscription?.variant || null;

// 未订阅用户：事务内原子递增 trial 计数，防止并发绕过
let trialUsed = 0;
if (!isSubscribed) {
  const trialResult = await db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ trialUsed: schema.profiles.trialUsed })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, session.user.id))
      .for('update');

    const current = profile?.trialUsed || 0;

    if (current >= 3) {
      return { allowed: false, trialUsed: current };
    }

    if (!profile) {
      await tx.insert(schema.profiles).values({
        userId: session.user.id,
        trialUsed: 1,
      });
    } else {
      await tx
        .update(schema.profiles)
        .set({ trialUsed: current + 1 })
        .where(eq(schema.profiles.userId, session.user.id));
    }

    return { allowed: true, trialUsed: current + 1 };
  });

  trialUsed = trialResult.trialUsed;

  if (!trialResult.allowed) {
    return Response.json({
      error: 'Trial exhausted',
      code: 'TRIAL_EXHAUSTED',
      trial_used: trialUsed,
      trial_limit: 3,
    }, { status: 402 });
  }
}
```

- [ ] **Step 2: 更新 rate limit 函数，增加 JSDoc**

编辑 `checkRateLimit` 函数，增加文档注释：

```typescript
/**
 * 单实例速率限制（内存 Map）
 * 注意：Vercel serverless 多实例间不共享，实际限制 = 10 × 实例数
 * 长期方案需接入分布式限流（如 Upstash Redis）
 */
function checkRateLimit(userId: string): boolean {
```

- [ ] **Step 3: TypeScript 编译检查**

Run: `npx tsc --noEmit 2>&1 | head -15`
Expected: 无类型错误（`for('update')` 是 Drizzle 的标准 API，需要确保 drizzle-orm 版本支持）

- [ ] **Step 4: 验证事务语法正确**

Run: `node -e "require('drizzle-orm')" 2>&1`
Expected: drizzle-orm 已安装，无模块错误

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "fix: atomic trial count via transaction with FOR UPDATE to prevent race condition"
```

---

### Task 5: Cron Cleanup 批量删除

**文件:**
- 修改: `app/api/cron/cleanup/route.ts`

- [ ] **Step 1: 改 Starter 段为批量删除**

替换 `app/api/cron/cleanup/route.ts` 中 Starter 段（约第 53-70 行）：

```typescript
// Starter: 删除 7 天前的消息
if (starterUserIds.length > 0) {
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const convs = await db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .where(inArray(schema.conversations.userId, starterUserIds));

  const convIds = convs.map((c) => c.id);
  if (convIds.length > 0) {
    const result = await db
      .delete(schema.messages)
      .where(
        and(
          inArray(schema.messages.conversationId, convIds),
          lte(schema.messages.createdAt, cutoff),
        ),
      );
    cleanedStarter = result.rowCount || 0;
  }
}
```

- [ ] **Step 2: 改 Pro 段为批量删除**

替换 Pro 段（约第 73-91 行）：

```typescript
// Pro: 删除 30 天前的消息
if (proUserIds.length > 0) {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const convs = await db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .where(inArray(schema.conversations.userId, proUserIds));

  const convIds = convs.map((c) => c.id);
  if (convIds.length > 0) {
    const result = await db
      .delete(schema.messages)
      .where(
        and(
          inArray(schema.messages.conversationId, convIds),
          lte(schema.messages.createdAt, cutoff),
        ),
      );
    cleanedPro = result.rowCount || 0;
  }
}
```

- [ ] **Step 3: 改 Unsub 段为批量删除**

替换 Unsub 段（约第 95-133 行，两段合并）：

```typescript
// 未订阅用户: 删除 7 天前的消息
const allSubUserIds = activeSubs.map((s) => s.userId);
const unsubCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const unsubConvs = allSubUserIds.length > 0
  ? await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(notInArray(schema.conversations.userId, allSubUserIds))
  : await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations);

const unsubConvIds = unsubConvs.map((c) => c.id);
if (unsubConvIds.length > 0) {
  const result = await db
    .delete(schema.messages)
    .where(
      and(
        inArray(schema.messages.conversationId, unsubConvIds),
        lte(schema.messages.createdAt, unsubCutoff),
      ),
    );
  cleanedUnsub = result.rowCount || 0;
}
```

- [ ] **Step 4: TypeScript 编译检查**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/cleanup/route.ts
git commit -m "perf: replace per-conversation DELETE loop with batch inArray delete in cron cleanup"
```

---

### Task 6: 前端 ChatPageClient 移除 trial PATCH

**文件:**
- 修改: `app/[lang]/chat/[expert]/page.tsx`

- [ ] **Step 1: 移除 handleSend 中的异步 trial PATCH 调用**

编辑 `app/[lang]/chat/[expert]/page.tsx`，在 `handleSend` 函数中删除 trial PATCH 代码块（约第 141-151 行）：

**删除以下代码：**
```typescript
// ---------- 递增试用计数（未订阅用户）----------
if (subscriptionStatus && !subscriptionStatus.subscribed) {
  fetch('/api/subscription/trial', { method: 'PATCH' })
    .then((res) => res.json())
    .then((data) => {
      setSubscriptionStatus((prev) =>
        prev ? { ...prev, trialUsed: data.trial_used } : prev
      );
    })
    .catch(() => {});
}
```

替换为：服务端 chat API 返回 `TRIAL_EXHAUSTED`（402）时，前端直接更新 `trialUsed` 为 `trialLimit`。

- [ ] **Step 2: 处理 chat API 返回的 402 错误**

在 handleSend 中，`res.status` 处理增加 402 分支。在现有 429 分支之后增加：

```typescript
// 试用已耗尽 (402 Payment Required)
if (res.status === 402) {
  setSubscriptionStatus((prev) =>
    prev ? { ...prev, trialUsed: prev.trialLimit } : prev
  );
  setMessages((prev) => [
    ...prev,
    {
      role: 'assistant',
      content: '你已用完 3 条免费消息，请订阅后继续。',
    },
  ]);
  return;
}
```

（插入位置：在 `if (res.status === 429)` 代码块之后，`if (!res.ok)` 代码块之前）

- [ ] **Step 3: TypeScript 编译检查**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add app/\[lang\]/chat/\[expert\]/page.tsx
git commit -m "refactor: remove client-side trial PATCH, handle 402 TRIAL_EXHAUSTED from server"
```

---

### Task 7: Vercel 环境变量补充

- [ ] **Step 1: 添加 6 个国内 variant 变量到 Vercel Production**

```bash
vercel env add LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC production
# 输入: 1637877
vercel env add LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC production
# 输入: 1637873
vercel env add LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC production
# 输入: 1637874
vercel env add LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC production
# 输入: 1637868
vercel env add LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC production
# 输入: 1637878
vercel env add LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC production
# 输入: 1637865
```

- [ ] **Step 2: 更新 Vercel 上现有 7 个国外 + test variant 的空值**

这 7 个变量已存在于 Vercel 但值为空，需要用 `vercel env rm` + `vercel env add` 更新：

```bash
# 删除旧变量
vercel env rm LEMONSQUEEZY_VARIANT_STARTER_MONTHLY production
vercel env rm LEMONSQUEEZY_VARIANT_STARTER_YEARLY production
vercel env rm LEMONSQUEEZY_VARIANT_PRO_MONTHLY production
vercel env rm LEMONSQUEEZY_VARIANT_PRO_YEARLY production
vercel env rm LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY production
vercel env rm LEMONSQUEEZY_VARIANT_ULTRA_YEARLY production
vercel env rm LEMONSQUEEZY_VARIANT_TEST production

# 重新添加并填入值
vercel env add LEMONSQUEEZY_VARIANT_STARTER_MONTHLY production  # 1637808
vercel env add LEMONSQUEEZY_VARIANT_STARTER_YEARLY production   # 1637817
vercel env add LEMONSQUEEZY_VARIANT_PRO_MONTHLY production      # 1637811
vercel env add LEMONSQUEEZY_VARIANT_PRO_YEARLY production       # 1637816
vercel env add LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY production    # 1637812
vercel env add LEMONSQUEEZY_VARIANT_ULTRA_YEARLY production     # 1637814
vercel env add LEMONSQUEEZY_VARIANT_TEST production             # 1637854
```

- [ ] **Step 3: 验证 Vercel 环境变量**

```bash
vercel env ls
```
Expected: 所有 13 个 `LEMONSQUEEZY_VARIANT_*` 变量均存在于 Production

- [ ] **Step 4: 同步到本地 .env.local**

```bash
vercel env pull --environment production -y
```

- [ ] **Step 5: Commit（如果 .env.local.example 需要更新）**

```bash
git add .env.local.example
git commit -m "chore: add domestic variant env vars to .env.local.example"
```
（`.env.local.example` 已经包含这些变量，仅需确认是否需要补充说明）

---

## 验证清单

实施完成后，验证：

- [ ] `npx tsc --noEmit` 无错误
- [ ] `npx drizzle-kit migrate` 成功执行迁移
- [ ] 模拟 webhook 调用 `subscription_created` 使用 domestic variant ID → 数据库正确写入
- [ ] 模拟 trial 并发请求 → 不会超过 3 条限制
- [ ] 模拟 webhook `subscription_updated` 升级 → variantName 正确更新
- [ ] 模拟 webhook `subscription_payment_failed` → 状态更新为 cancelled
- [ ] Chron cleanup → 日志输出批量删除数量
