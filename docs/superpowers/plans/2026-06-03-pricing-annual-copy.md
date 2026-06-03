# 定价页年付文案更新 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 将定价页月/年付切换栏旁的折扣徽章文案从"省 16% / Save 16%"改为"年付更省 / Cheaper annually"

**Architecture:** 纯文案替换：PricingSection.tsx 中 1 行变更 + 2 个 i18n 文件各新增 1 个 key、删除 1 个废弃 key。不涉及 UI 结构或逻辑变更。

**Tech Stack:** Next.js + next-intl + TypeScript

---

### 当前代码速览

**PricingSection.tsx 关键行：**
- 第 84-88 行：`maxSavePercent` 变量计算（需删除）
- 第 121 行：`{tp('savePercent', { percent: maxSavePercent })}`（需替换）

**messages/zh.json 关键行：**
- 第 274 行：`"savePercent": "省 {percent}%"`（需删除，仅 PricingSection.tsx 引用）
- 需要新增 `"cheaperAnnually"` key（在 pricing 块内）

**messages/en.json 关键行：**
- 第 274 行：`"savePercent": "Save {percent}%"`（需删除）
- 需要新增 `"cheaperAnnually"` key

**注意区分：** `savePerYear`（PricingCard.tsx 使用）≠ `savePercent`（PricingSection.tsx 使用），`savePerYear` 不在此次改动范围。

---

## 改动文件清单

| # | 文件 | 操作 |
|---|------|------|
| 1 | `heartlab/messages/zh.json` | 新增 `cheaperAnnually`，删除 `savePercent` |
| 2 | `heartlab/messages/en.json` | 新增 `cheaperAnnually`，删除 `savePercent` |
| 3 | `heartlab/components/pricing/PricingSection.tsx` | 替换文案 + 删除 `maxSavePercent` |

---

### Task 1: 更新中文翻译文件

**文件:** `heartlab/messages/zh.json`

- [ ] **Step 1: 新增 `cheaperAnnually` key**

在 `pricing.savePercent` 行之前插入新 key：

```diff
--- a/heartlab/messages/zh.json
+++ b/heartlab/messages/zh.json
     "yearlySave": "${monthly}/月 — 年付更优惠（${yearly}/年）",
+    "cheaperAnnually": "年付更省",
     "savePercent": "省 {percent}%",
```

- [ ] **Step 2: 删除废弃的 `savePercent` key**

```diff
     "cheaperAnnually": "年付更省",
-    "savePercent": "省 {percent}%",
     "subscribe": "立即订阅",
```

- [ ] **Step 3: 验证 JSON 格式**

```bash
node -e "JSON.parse(require('fs').readFileSync('heartlab/messages/zh.json','utf8'))" && echo "OK"
```

期望输出：`OK`

---

### Task 2: 更新英文翻译文件

**文件:** `heartlab/messages/en.json`

- [ ] **Step 1: 新增 `cheaperAnnually` key**

在 `pricing.savePercent` 行之前插入：

```diff
--- a/heartlab/messages/en.json
+++ b/heartlab/messages/en.json
     "yearlySave": "${monthly}/mo — cheaper annually (${yearly}/yr)",
+    "cheaperAnnually": "Cheaper annually",
     "savePercent": "Save {percent}%",
```

- [ ] **Step 2: 删除废弃的 `savePercent` key**

```diff
     "cheaperAnnually": "Cheaper annually",
-    "savePercent": "Save {percent}%",
     "subscribe": "Subscribe",
```

- [ ] **Step 3: 验证 JSON 格式**

```bash
node -e "JSON.parse(require('fs').readFileSync('heartlab/messages/en.json','utf8'))" && echo "OK"
```

期望输出：`OK`

---

### Task 3: 更新 PricingSection 组件

**文件:** `heartlab/components/pricing/PricingSection.tsx`

- [ ] **Step 1: 删除 `maxSavePercent` 变量计算（约第 84-88 行）**

```diff
-  // 计算年付折扣百分比
-  const maxSavePercent = Math.round(
-    (1 - plans[2].yearlyPrice / (plans[2].monthlyPrice * 12)) * 100
-  );
```

- [ ] **Step 2: 替换徽章文案（第 121 行）**

```diff
-              {tp('savePercent', { percent: maxSavePercent })}
+              {tp('cheaperAnnually')}
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd heartlab && npx tsc --noEmit 2>&1 | head -20
```

期望：无新增类型错误（`maxSavePercent` 删除后无其他引用报错）

---

### Task 4: 最终验证

- [ ] **Step 1: 运行测试**

```bash
cd heartlab && npm test 2>&1
```

期望：所有已有测试通过

- [ ] **Step 2: 确认无残留引用**

```bash
cd heartlab && grep -rn "savePercent" --include="*.tsx" --include="*.ts" --include="*.json" . | grep -v node_modules | grep -v ".next"
```

期望：无输出（`savePercent` 已完全移除）

---

## 验收确认

1. ✅ `grep savePercent` 在源码中无结果
2. ✅ `grep cheaperAnnually` 在 PricingSection.tsx 和两个 messages 文件中各出现 1 次
3. ✅ `npm test` 全部通过
4. ✅ `npx tsc --noEmit` 无新增类型错误
