// app/[lang]/pricing/page.tsx
// /[lang]/pricing — 定价页（服务端组件）
// 从服务端获取 session 和环境变量，传递给客户端组件 PricingSection

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { PricingSection } from '@/components/pricing/PricingSection';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  /** 从环境变量读取 LemonSqueezy Variant ID */
  const variantIds = {
    starterMonthly: process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY || '',
    starterYearly: process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY || '',
    proMonthly: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY || '',
    proYearly: process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY || '',
    ultraMonthly: process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY || '',
    ultraYearly: process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY || '',
  };

  return (
    <main>
      <PricingSection lang={lang} isLoggedIn={!!session?.user} variantIds={variantIds} />
    </main>
  );
}
