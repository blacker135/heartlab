// app/api/subscription/webhook/route.ts
// POST /api/subscription/webhook — 接收 LemonSqueezy 事件回调，同步订阅状态

import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, getVariantName } from '@/lib/lemonsqueezy';

interface LSEvent {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    attributes: {
      customer_id?: number;
      variant_id?: number;
      status?: string;
      renews_at?: string;
      created_at?: string;
      ends_at?: string;
      cancelled?: boolean;
      order_id?: number;         // 订单 ID
      first_order_item?: {       // 订阅的首个订单项
        order_id?: number;
      };
    };
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-Signature') || '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: LSEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = event.meta.event_name;
  const userId = event.meta.custom_data?.user_id;
  const subId = event.data.id;
  const variantId = String(event.data.attributes.variant_id || '');
  const status = event.data.attributes.status;
  const renewsAt = event.data.attributes.renews_at;
  const createdAt = event.data.attributes.created_at;
  const cancelled = event.data.attributes.cancelled;
  const customerId = event.data.attributes.customer_id;
  const orderId = event.data.attributes.order_id
    || event.data.attributes.first_order_item?.order_id;

  const variantName = getVariantName(variantId);

  try {
    switch (eventName) {
      case 'subscription_created': {
        if (!userId || !variantName) break;
        // 先删再插，处理重复 webhook
        await db.delete(schema.subscriptions).where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
        await db.insert(schema.subscriptions).values({
          userId,
          lemonSqueezySubscriptionId: subId,
          lemonSqueezyVariantId: variantId,
          variantName: variantName as 'starter' | 'pro' | 'ultra',
          status: status === 'active' ? 'active' : 'cancelled',
          currentPeriodStart: createdAt ? new Date(createdAt) : undefined,
          currentPeriodEnd: renewsAt ? new Date(renewsAt) : undefined,
          lemonSqueezyCustomerId: customerId ? String(customerId) : undefined,
          lemonSqueezyOrderId: orderId ? String(orderId) : undefined,
        });
        break;
      }

      case 'subscription_updated': {
        const updates: Record<string, any> = {};
        if (status) updates.status = status === 'active' ? 'active' : status === 'cancelled' ? 'cancelled' : 'expired';
        if (renewsAt) updates.currentPeriodEnd = new Date(renewsAt);
        if (cancelled !== undefined) updates.cancelAtPeriodEnd = cancelled;
        // 升级/降级时更新 variant
        if (variantId) {
          updates.lemonSqueezyVariantId = variantId;
          if (variantName) updates.variantName = variantName;
        }
        updates.updatedAt = new Date();

        await db
          .update(schema.subscriptions)
          .set(updates)
          .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
        break;
      }

      case 'subscription_cancelled': {
        await db
          .update(schema.subscriptions)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
        break;
      }

      case 'subscription_payment_failed': {
        await db
          .update(schema.subscriptions)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
        console.error('[LS Webhook] Payment failed:', { subId, userId, variantName });
        break;
      }

      case 'subscription_expired': {
        await db
          .update(schema.subscriptions)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
        console.log('[LS Webhook] Subscription expired:', { subId, userId, variantName });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Webhook processing failed:', err);
    return Response.json({ error: 'Processing failed' }, { status: 400 });
  }

  return Response.json({ received: true });
}
