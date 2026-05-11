// components/pricing/PricingCard.tsx
// 单个方案卡片：展示方案名、价格、权益列表、CTA 按钮

'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface PlanData {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  highlighted?: boolean;
}

interface PricingCardProps {
  plan: PlanData;
  isYearly: boolean;
  isLoggedIn: boolean;
  variantId: string;
  lang: string;
}

export function PricingCard({ plan, isYearly, isLoggedIn, variantId, lang }: PricingCardProps) {
  const router = useRouter();
  const tp = useTranslations('pricing');

  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const period = isYearly ? tp('year') : tp('month');

  /** 处理 CTA 按钮点击：未登录跳转登录页，已登录跳转 LemonSqueezy checkout */
  const handleCTA = async () => {
    if (!isLoggedIn) {
      router.push(`/${lang}/auth/login?redirect=/pricing`);
      return;
    }

    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-[24px] border-2 p-6 ${
        plan.highlighted
          ? 'border-[#FF7A59] bg-[#FF7A59]/5'
          : 'border-gray-100 bg-white'
      }`}
    >
      {/* 方案名称 */}
      <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>

      {/* 价格展示 */}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-text-primary">${price}</span>
        <span className="text-sm text-text-secondary">/{period}</span>
      </div>
      {isYearly && (
        <p className="mt-1 text-xs text-[#FF7A59]">
          {tp('yearlySave', { monthly: plan.monthlyPrice, yearly: plan.yearlyPrice })}
        </p>
      )}

      {/* 功能列表 */}
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FF7A59]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA 按钮 */}
      <button
        type="button"
        onClick={handleCTA}
        className={`mt-6 w-full rounded-[16px] py-2.5 text-sm font-medium transition-colors ${
          plan.highlighted
            ? 'bg-[#FF7A59] text-white hover:bg-[#FF7A59]/90'
            : 'bg-[#FAF7F2] text-text-primary hover:bg-gray-100'
        }`}
      >
        {isLoggedIn ? tp('subscribe') : tp('startTrial')}
      </button>
    </div>
  );
}
