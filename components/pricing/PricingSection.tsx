// components/pricing/PricingSection.tsx
// 三方案对比区：月付/年付切换 + 三列 PricingCard

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PricingCard } from './PricingCard';

interface PricingSectionProps {
  lang: string;
  isLoggedIn: boolean;
  variantIds: {
    starterMonthly: string;
    starterYearly: string;
    proMonthly: string;
    proYearly: string;
    ultraMonthly: string;
    ultraYearly: string;
  };
}

export function PricingSection({ lang, isLoggedIn, variantIds }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const tp = useTranslations('pricing');

  /** 三个定价方案的定义 */
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 9,
      yearlyPrice: 99,
      variantIdMonthly: variantIds.starterMonthly,
      variantIdYearly: variantIds.starterYearly,
      features: [
        tp('features.dailyMessages', { count: 30 }),
        tp('features.expertsStarter'),
        tp('features.historyDays', { count: 7 }),
        tp('features.effectLight'),
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 29,
      yearlyPrice: 319,
      highlighted: true,
      variantIdMonthly: variantIds.proMonthly,
      variantIdYearly: variantIds.proYearly,
      features: [
        tp('features.dailyMessages', { count: 100 }),
        tp('features.expertsAll'),
        tp('features.historyDays', { count: 30 }),
        tp('features.effectStandard'),
      ],
    },
    {
      id: 'ultra',
      name: 'Ultra',
      monthlyPrice: 49,
      yearlyPrice: 539,
      variantIdMonthly: variantIds.ultraMonthly,
      variantIdYearly: variantIds.ultraYearly,
      features: [
        tp('features.unlimitedMessages'),
        tp('features.expertsAll'),
        tp('features.historyForever'),
        tp('features.effectDeep'),
      ],
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      {/* 页头 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">{tp('title')}</h2>
        <p className="mt-2 text-text-secondary">{tp('subtitle')}</p>
      </div>

      {/* 月付/年付切换 */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <span className={`text-sm ${!isYearly ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
          {tp('monthly')}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isYearly}
          onClick={() => setIsYearly(!isYearly)}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            isYearly ? 'bg-[#FF7A59]' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              isYearly ? 'translate-x-[22px]' : 'translate-x-[2px]'
            }`}
          />
        </button>
        <span className={`text-sm ${isYearly ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
          {tp('yearly')}
        </span>
        {isYearly && (
          <span className="rounded-full bg-[#FF7A59]/10 px-2 py-0.5 text-xs font-medium text-[#FF7A59]">
            {tp('savePercent', { percent: 8 })}
          </span>
        )}
      </div>

      {/* 三卡片网格 */}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isYearly={isYearly}
            isLoggedIn={isLoggedIn}
            variantId={isYearly ? plan.variantIdYearly : plan.variantIdMonthly}
            lang={lang}
          />
        ))}
      </div>
    </section>
  );
}
