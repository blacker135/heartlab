# Pricing 页面 & 会员标识 — 设计规格

**日期：** 2026-05-11
**状态：** 已确认

---

## 概述

对定价页面和导航栏会员标识进行四项改进：
1. 新增 $0.01 测试支付方案（临时）
2. 月付/年付切换改为按钮形式，年付带省钱标注
3. 年费价格以折算月费形式展示，带省钱标注
4. Navbar 用户头像旁添加会员标识或"升级"入口

额外追加：
5. 国内外用户支付模式区分（一次性买断 vs 订阅制）
6. 会员标识悬停显示权益 + 到期日期

---

## 一、国内外支付模式

### 判断逻辑

优先级：`x-vercel-ip-country` 请求头 → 语言兜底

- `x-vercel-ip-country === 'CN'` → 国内模式
- 其他或无此头 → `lang === 'zh'` 则国内，否则国外

### 国内模式（一次性买断）

- 不显示月付/年付切换
- 展示一次性买断价格，标注有效期天数
- 需新增环境变量：`LEMONSQUEEZY_VARIANT_STARTER_ONETIME`、`LEMONSQUEEZY_VARIANT_PRO_ONETIME`、`LEMONSQUEEZY_VARIANT_ULTRA_ONETIME`
- LemonSqueezy 侧配置对应的一次性支付 variant（设置固定天数到期）
- 到期后通过 webhook 收到 `subscription_expired` 事件，更新状态为 `expired`

### 国外模式（订阅制）

- 显示月付/年付切换按钮
- 现有订阅制逻辑不变
- 到期自动续费（LemonSqueezy 管理）

---

## 二、$0.01 测试方案

### 显隐控制

- 环境变量：`NEXT_PUBLIC_SHOW_TEST_PLAN=true`
- false 或不设置时不显示
- 后续删除时移除环境变量和相关代码即可

### 视觉样式

- 卡片使用虚线边框（`border-dashed border-gray-300`）
- 与其他正式方案卡片明显区分
- CTA 按钮文案：「测试支付 ($0.01)」

### 功能

- 功能等同于 Starter 方案
- 价格 $0.01，支付流程与正式方案一致

---

## 三、月付/年付按钮切换

### 按钮组样式

- 两个并排 pill 按钮：`月付` | `年付`
- 整体容器：圆角 `rounded-full`，`bg-gray-100` 底
- 选中态：`bg-[#FF7A59] text-white` pill（覆盖在选中按钮上）
- 未选中态：透明底，`text-text-secondary`
- 年付按钮右侧叠加「省 8%」标签：`bg-[#FF7A59]/10 text-[#FF7A59] text-xs rounded-full px-2`

### 交互

- 点击切换，无动画延迟
- 按钮尺寸：`px-4 py-1.5 text-sm`

---

## 四、年费折算月费展示

### 价格显示（选年付时）

```
主价格：$8.25 /月   （折算月费 = 年费 ÷ 12，保留两位小数）
副行：  $99/年       （次色文字，较小字号）
省钱：  比月付省 $9/年 （橙色文字，text-xs）
```

### 实现

- `PricingCard` 接收 `isYearly` 后计算 `monthlyEquivalent`
- 用 `Number.toFixed(2)` 保留两位小数
- 省钱金额 = `monthlyPrice * 12 - yearlyPrice`

---

## 五、Navbar 会员标识

### 服务端数据获取（Navbar.tsx）

- 查询 `subscriptions` 表：`variantName`、`status`、`currentPeriodEnd`
- 查询 `profiles` 表：`trialUsed`
- 传入 `NavbarClient`
- 对于一次性买断用户，到期日期 = `currentPeriodEnd`

### 客户端渲染（NavbarClient.tsx）

**会员用户：**

- 头像右侧显示等级 Tag，圆角 pill：
  - Starter → `bg-gray-100 text-gray-600`
  - Pro → `bg-blue-50 text-blue-600`
  - Ultra → `bg-amber-50 text-amber-600`
- 悬停 Tag 时显示 Tooltip：

```
┌─────────────────────────┐
│ Pro 会员                 │
│ ─────────────────────── │
│ 每日 100 条消息          │
│ 全部 4 位专家            │
│ 标准深度指导             │
│ ─────────────────────── │
│ 到期：2026-06-11         │
└─────────────────────────┘
```

- Tooltip 使用 `absolute` 定位在 Tag 下方
- 背景白色，`shadow-soft`，圆角 `rounded-[12px]`
- 权益摘要从 plan 配置静态映射获取
- 国外用户显示 `currentPeriodEnd`；国内用户显示到期日期

**非会员用户：**

- 头像右侧显示「升级」按钮：
  - 圆角 pill，`bg-[#FF7A59]/10 text-[#FF7A59] text-xs font-medium`
  - 点击跳转 `/pricing`

---

## 六、i18n 新增文案

### zh.json

```json
"pricing": {
  "monthlyEquivalent": "折合 ${{price}}/月",
  "savePerYear": "比月付省 ${{amount}}/年",
  "testPlanName": "测试方案",
  "testPlanCTA": "测试支付 ($0.01)",
  "oneTime": "一次性付费",
  "validDays": "{{days}} 天有效"
},
"membership": {
  "upgrade": "升级",
  "expires": "到期：{{date}}",
  "oneTimeExpires": "有效至：{{date}}"
}
```

### en.json

```json
"pricing": {
  "monthlyEquivalent": "${{price}}/mo equivalent",
  "savePerYear": "Save ${{amount}}/yr vs monthly",
  "testPlanName": "Test Plan",
  "testPlanCTA": "Test Pay ($0.01)",
  "oneTime": "One-time payment",
  "validDays": "Valid {{days}} days"
},
"membership": {
  "upgrade": "Upgrade",
  "expires": "Expires: {{date}}",
  "oneTimeExpires": "Valid until: {{date}}"
}
```

---

## 七、方案权益映射

用于会员标识 Tooltip 权益展示：

| Plan | 每日消息 | 专家 | 深度 | 历史 |
|------|---------|------|------|------|
| Starter | 30 条 | Evan + Liam | 轻量 | 7 天 |
| Pro | 100 条 | 全部 4 位 | 标准 | 30 天 |
| Ultra | 无限 | 全部 4 位 | 深度 | 永久 |

---

## 八、变更文件清单

| 文件 | 变更说明 |
|------|----------|
| `app/[lang]/pricing/page.tsx` | 传入 IP 国家（读 headers）、showTestPlan 环境变量 |
| `components/pricing/PricingSection.tsx` | 国内外分支、按钮切换、测试方案卡片、一次性价格展示 |
| `components/pricing/PricingCard.tsx` | 折算月费显示、一次性付费样式、测试方案虚线边框 |
| `components/common/Navbar.tsx` | 查询 subscriptions + profiles |
| `components/common/NavbarClient.tsx` | 会员 Tag + Tooltip、「升级」按钮 |
| `messages/zh.json` | 新增文案 |
| `messages/en.json` | 新增文案 |
