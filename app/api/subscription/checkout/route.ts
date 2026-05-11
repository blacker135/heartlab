// app/api/subscription/checkout/route.ts
// POST /api/subscription/checkout — 生成 LemonSqueezy 结账 URL

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createCheckout } from '@/lib/lemonsqueezy';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { variant_id?: string; redirect_url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.variant_id || typeof body.variant_id !== 'string') {
    return Response.json({ error: 'variant_id is required' }, { status: 400 });
  }

  // 验证 redirect_url 必须指向自身域名，使用 URL API 比对其 origin 防止域名欺骗
  if (body.redirect_url) {
    try {
      const redirectOrigin = new URL(body.redirect_url).origin;
      const appOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
      if (redirectOrigin !== appOrigin) {
        return Response.json({ error: 'Invalid redirect_url' }, { status: 400 });
      }
    } catch {
      return Response.json({ error: 'Invalid redirect_url format' }, { status: 400 });
    }
  }

  try {
    const url = await createCheckout(body.variant_id, session.user.id, body.redirect_url);
    return Response.json({ url });
  } catch (err) {
    console.error('Checkout creation failed:', err);
    return Response.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
