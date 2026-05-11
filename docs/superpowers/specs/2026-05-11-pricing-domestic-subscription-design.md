# 定价页国内订阅制改造设计文档

> 创建日期：2026-05-11 | 涉及模块：PricingCard、PricingSection、PricingPage、i18n、env

---

## 一、改动目标

1. 国内用户从买断制改为订阅制（手动续费），UI 与国外一致
2. 年付卡片展示优化：原月费+删除线+省钱百分比，鼓励年付
3. 移除所有一次性买断（onetime）相关代码和文案

---

## 二、改动文件

| # | 文件 | 改动 |
|---|------|------|
| 1 | `.env.local.example` | `*_ONETIME` → `*_MONTHLY_DOMESTIC` + `*_YEARLY_DOMESTIC`（6个） |
| 2 | `app/[lang]/pricing/page.tsx` | variantIds 改为国内月付/年付变量，移除 onetime |
| 3 | `components/pricing/PricingSection.tsx` | 移除 isDomestic 门控，月/年切换全员可见，国内使用国内 Variant ID |
| 4 | `components/pricing/PricingCard.tsx` | 移除 isOneTime 参数和逻辑，年付展示改为删除线月费+百分比 |
| 5 | `messages/en.json` | savePerYear 改用 percent 参数，移除 oneTime/validDays |
| 6 | `messages/zh.json` | 同上 |

---

## 三、详细方案

### 3.1 环境变量

移除 3 个 `*_ONETIME` 变量，新增 6 个国内专用变量：

```
LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC=
```

### 3.2 PricingPage（服务端）

- `variantIds` 对象：用 6 个国内变量替换 3 个 onetime 变量
- `isDomestic` 判断保留，仅用于选择变体 ID 来源

### 3.3 PricingSection

- **移除**：`isDomestic` 门控月/年切换（所有用户可见切换按钮）
- **移除**：`oneTime` 提示文字区域
- **移除**：plan 定义中的 `onetimePrice`、`validDays`、`variantIdOnetime`
- **新增**：plan 定义中的 `variantIdDomesticMonthly`、`variantIdDomesticYearly`
- **变体选择逻辑**：国内用户 → 国内月付/年付 ID；国外用户 → 国外月付/年付 ID
- **移除**：`isOneTime` prop 传递给 PricingCard

### 3.4 PricingCard

- **移除**：`isOneTime` prop 和 `onetimePrice` / `validDays` 相关逻辑
- **移除**：`periodLabel` 的条件判断（始终显示 /月）
- **年付展示改为**：`~~$9.00~~/月 省 8%`（原月费+删除线+百分比）
- **百分比计算**：`Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100)`
- **i18n**：`savePerYear` 传入 `percent` 参数

### 3.5 i18n 变更

| 键 | 当前值 | 新值 |
|----|--------|------|
| `pricing.savePerYear` (en) | Save ${{amount}}/yr vs monthly | Save {{percent}}% |
| `pricing.savePerYear` (zh) | 比月付省 ${{amount}}/年 | 省 {{percent}}% |
| `pricing.oneTime` | 删除 | — |
| `pricing.validDays` | 删除 | — |
| `membership.oneTimeExpires` | 删除 | — |

---

## 四、不影响的部分

- 订阅 API（checkout/webhook/status/trial）：无需改动，统一使用 Variant ID
- Navbar 会员标识：无需改动，订阅数据查询逻辑不变
- 聊天门控（trial/limit/expert lock）：无需改动
