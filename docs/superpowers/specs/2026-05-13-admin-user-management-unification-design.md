# 后台管理系统：用户体系统一 & 跳转修复 设计规格

## 概述

合并后台管理系统的「用户管理」「会员管理」「订阅管理」为统一的用户管理页面，同时修复管理员登录后无限跳转的问题。

## 需求

### 管理员跳转修复
- 管理员登录后仅首次强制跳转到后台，之后可自由访问前台页面
- 使用 sessionStorage 标记跳转状态，标签页级别隔离
- 管理员退出登录时清除标记

### 用户体系统一
- 合并三页为一张统一用户表：用户名、邮箱、会员身份、到期时间、日限额、注册时间
- 未订阅用户视为 free 用户
- 管理员可编辑：用户名、密码、邮箱、会员身份（free/starter/pro/ultra/admin）、到期时间、日限额
- 身份切换由系统自动处理底层订阅记录
- 支持分页和身份筛选
- 移除旧的「会员管理」和「订阅管理」页面及 API

### 日限额调整
- Ultra 方案日限额：无限制 → 10,000 条/天
- 定价页同步更新

---

## 设计

### 1. 管理员跳转修复

**文件**：`components/admin/AdminRedirect.tsx`

```
渲染时：
  1. 检查 sessionStorage.getItem('admin_redirected')
  2. 已存在 → 不跳转
  3. 不存在 + isAdmin=true → router.replace('/admin') + sessionStorage.setItem('admin_redirected', '1')
```

**文件**：`components/common/NavbarClient.tsx` — handleLogout() 中清除 `sessionStorage.removeItem('admin_redirected')`

### 2. 统一用户列表页

**文件**：`app/admin/users/page.tsx`

表格列：
| 列名 | 字段 | 说明 |
|------|------|------|
| 用户名 | user.name | - |
| 邮箱 | user.email | - |
| 会员身份 | subscription.variantName 或 'free' | 彩色标签 |
| 到期时间 | subscription.currentPeriodEnd | free 显示 '-' |
| 日限额 | daily_limit 或方案默认值 | 如 30/100/10000 |
| 注册时间 | user.createdAt | 只读 |

筛选：身份筛选栏（全部/Free/Starter/Pro/Ultra/Admin）+ 搜索框 + 分页

**API**：`GET /api/admin/users` 扩展：
- 关联 subscriptions 表，返回 variantName、status、currentPeriodEnd
- 关联 profiles 表，返回 daily_limit
- 支持 `variant` 查询参数筛选

### 3. 用户详情页增强

**文件**：`app/admin/users/[id]/page.tsx`

新增可编辑字段：
- 密码：输入框 + 设置按钮，直接覆盖（Better Auth API）
- 会员身份：下拉选择 free/starter/pro/ultra/admin
- 到期时间：日期选择器，非 free 时显示
- 日限额：数字输入框，留空使用方案默认值

**身份切换逻辑**（PATCH API 处理）：
- free → 付费：创建 subscriptions 记录，paypal_subscription_id = `manual_{adminId}_{timestamp}`
- 付费 → free：当前订阅 status → 'cancelled'
- 付费 → 付费：更新 variantName + currentPeriodEnd
- admin：variantName = 'admin'，无到期

### 4. API 变更

| 端点 | 方法 | 变更 |
|------|------|------|
| `/api/admin/users` | GET | 扩展关联+筛选 |
| `/api/admin/users/[id]` | GET | 扩展返回 subscription、daily_limit |
| `/api/admin/users/[id]` | PATCH | 新增 password、variantName、currentPeriodEnd、dailyLimit |

**移除**：
- `app/admin/members/*`
- `app/admin/subscriptions/*`
- `app/api/admin/members/*`
- `app/api/admin/subscriptions/*`

### 5. 数据库

**profiles 表新增字段**：
```sql
ALTER TABLE profiles ADD COLUMN daily_limit integer;
```

### 6. 门控调整

**文件**：`lib/subscription/gate.ts`

```typescript
const DAILY_LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  ultra: 10000,
};
```

### 7. 侧边栏

**文件**：`components/admin/AdminSidebar.tsx`

移除「会员管理」「订阅管理」导航项，「用户体系」分组只剩「用户管理」。

### 8. 定价页

**文件**：`components/pricing/PricingCard.tsx` / `PricingSection.tsx`

Ultra 日限额描述更新为 10,000 条/天。

---

## 文件变更清单

| 操作 | 文件 |
|------|------|
| 改 | `components/admin/AdminRedirect.tsx` |
| 改 | `components/common/NavbarClient.tsx` |
| 改 | `app/admin/users/page.tsx` |
| 改 | `components/admin/users/UserTable.tsx` |
| 改 | `app/admin/users/[id]/page.tsx` |
| 改 | `app/api/admin/users/route.ts` |
| 改 | `app/api/admin/users/[id]/route.ts` |
| 改 | `lib/db/schema.ts` |
| 新增 | `lib/db/migrations/0006_add_daily_limit.sql` |
| 改 | `lib/subscription/gate.ts` |
| 改 | `components/admin/AdminSidebar.tsx` |
| 改 | `components/pricing/PricingCard.tsx` / `PricingSection.tsx` |
| 删 | `app/admin/members/page.tsx` |
| 删 | `app/admin/members/[id]/page.tsx` |
| 删 | `app/admin/subscriptions/page.tsx` |
| 删 | `app/admin/subscriptions/[id]/page.tsx` |
| 删 | `app/api/admin/members/route.ts` |
| 删 | `app/api/admin/members/[id]/route.ts` |
| 删 | `app/api/admin/subscriptions/route.ts` |
| 删 | `app/api/admin/subscriptions/[id]/route.ts` |
| 删 | `app/api/admin/subscriptions/[id]/history/route.ts` |
