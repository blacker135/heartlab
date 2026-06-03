# 定价页年付文案更新 — 设计文档

日期：2026-06-03

## 背景

当前定价页月/年付切换栏旁显示"省 16% / Save 16%"，该百分比是动态计算值，且不同方案折扣率略有差异（15.9%~16.5%），不够精准。本次将文案改为简洁直观的固定文案，不改变 UI 结构。

## 计算数据（基准）

| 方案 | 月付 | 年付 | 等效月付 | 年省 | 约折扣 |
|------|------|------|----------|------|--------|
| Start | $9.9 | $99.9 | $8.33/月 | $18.9 | 16% |
| Pro | $19.9 | $199.9 | $16.66/月 | $38.9 | 16% |
| Ultra | $39.9 | $399.9 | $33.33/月 | $78.9 | 16% |
| Test | $0.1 | — | — | — | — |

> 数据来源：用户提供，与 `.env.local` 中 PayPal Plan ID 一致。

## 改动范围

### 唯一 UI 改动

月/年付切换栏旁的折扣徽章，替换文案：

| 语言 | 当前 | 改为 |
|------|------|------|
| 中文 | 省 16% | 年付更省 |
| 英文 | Save 16% | Cheaper annually |

### 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/pricing/PricingSection.tsx` | 修改 | `savePercent` → `cheaperAnnually`；删除 `maxSavePercent` 变量 |
| `messages/zh.json` | 新增 key | `"pricing.cheaperAnnually": "年付更省"` |
| `messages/en.json` | 新增 key | `"pricing.cheaperAnnually": "Cheaper annually"` |

### 随带清理

| 文件 | 操作 |
|------|------|
| `messages/zh.json` | 删除 `pricing.savePercent` key（如无其他引用） |
| `messages/en.json` | 删除 `pricing.savePercent` key（如无其他引用） |
| `PricingSection.tsx` | 删除 `maxSavePercent` 计算变量及相关注释 |

## 不做的事

- 不修改定价卡片结构（PricingCard 组件不变）
- 不新增等效月付/节省金额小字行
- 不修改付费逻辑、Plan ID、环境变量
- 不修改 PayPalButton 组件

## 国际化

新增 key：

| key | zh | en |
|-----|----|----|
| `pricing.cheaperAnnually` | 年付更省 | Cheaper annually |

## 验收标准

1. 定价页切换至"年付"时，徽章显示"年付更省"（中文）/ "Cheaper annually"（英文）
2. 切换至"月付"时徽章消失（保持现有逻辑）
3. 卡片价格、功能列表等其余内容不变
