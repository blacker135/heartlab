// app/api/settings/password/route.ts
// POST /api/settings/password — 修改密码

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.currentPassword || !body.newPassword) {
    return Response.json({ error: 'Current and new password are required' }, { status: 400 });
  }

  if (body.newPassword.length < 8) {
    return Response.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        revokeOtherSessions: false,
      },
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Change password failed:', err);
    return Response.json({ error: 'Failed to change password. Check your current password.' }, { status: 400 });
  }
}
