// app/api/settings/email/route.ts
// POST /api/settings/email — 发起邮箱变更（发送验证邮件）

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { newEmail?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.newEmail || typeof body.newEmail !== 'string' || !body.newEmail.includes('@')) {
    return Response.json({ error: 'Valid email is required' }, { status: 400 });
  }

  try {
    await auth.api.changeEmail({
      headers: await headers(),
      body: {
        newEmail: body.newEmail.trim(),
      },
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Change email failed:', err);
    return Response.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}
