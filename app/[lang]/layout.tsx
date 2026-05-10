/**
 * 语言路由布局
 * 为每个语言路由提供 next-intl 国际化上下文 + 全局导航栏
 */

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from '@/components/common/Providers';
import { Navbar } from '@/components/common/Navbar';

// 支持的语言类型
type SupportedLocale = 'en' | 'zh';

/**
 * 生成静态参数：预渲染所有支持的语言路由
 */
export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }));
}

/**
 * 语言布局组件
 * 校验语言有效性，加载翻译消息，渲染全局导航栏和子组件
 */
export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  // 验证语言是否在支持列表中，不支持则返回 404
  if (!routing.locales.includes(lang as SupportedLocale)) {
    notFound();
  }

  // 加载当前语言的翻译消息
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Navbar lang={lang} />
      {/* pt-14 为固定导航栏留出空间（h-14 = 56px） */}
      <div className="pt-14">
        <Providers>{children}</Providers>
      </div>
    </NextIntlClientProvider>
  );
}
