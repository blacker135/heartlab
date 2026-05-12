// app/api/settings/name/route.ts
// POST /api/settings/name — 更新用户名称

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return Response.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: { name: body.name.trim() },
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Update name failed:', err);
    return Response.json({ error: 'Failed to update name' }, { status: 500 });
  }
}
