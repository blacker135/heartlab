'use client';
// app/admin/users/[id]/page.tsx
// 用户详情页 — 查看/编辑用户完整信息：基本资料、密码、会员身份、到期时间、日限额

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/admin/shared/ConfirmDialog';

interface UserDetailData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  subscription: {
    id: string;
    variantName: string;
    status: string;
    currentPeriodEnd: string | null;
    paypalSubscriptionId: string;
  } | null;
  dailyLimit: number | null;
  messageCount: number;
}

interface EditableForm {
  name: string;
  email: string;
  password: string;
  variantName: string;
  currentPeriodEnd: string;
  dailyLimit: string;
}

const VARIANTS = [
  { label: 'Free', value: 'free' },
  { label: 'Starter', value: 'starter' },
  { label: 'Pro', value: 'pro' },
  { label: 'Ultra', value: 'ultra' },
  { label: 'Admin', value: 'admin' },
];

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [form, setForm] = useState<EditableForm>({
    name: '',
    email: '',
    password: '',
    variantName: 'free',
    currentPeriodEnd: '',
    dailyLimit: '',
  });

  const loadUser = () => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setForm({
          name: data.name,
          email: data.email,
          password: '',
          variantName: data.subscription?.variantName && data.subscription?.status === 'active'
            ? data.subscription.variantName : 'free',
          currentPeriodEnd: data.subscription?.currentPeriodEnd
            ? new Date(data.subscription.currentPeriodEnd).toISOString().split('T')[0]
            : '',
          dailyLimit: data.dailyLimit !== null ? String(data.dailyLimit) : '',
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          variantName: form.variantName,
          currentPeriodEnd: form.variantName !== 'free' ? (form.currentPeriodEnd || undefined) : undefined,
          dailyLimit: form.dailyLimit ? parseInt(form.dailyLimit, 10) : null,
        }),
      });
      setEditing(false);
      setForm((prev) => ({ ...prev, password: '' }));
      loadUser();
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    router.push('/admin/users');
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!user) return <div className="p-6 text-gray-400">用户不存在</div>;

  const currentVariant = user.subscription?.variantName && user.subscription?.status === 'active'
    ? user.subscription.variantName : 'free';

  const isFree = form.variantName === 'free' || form.variantName === '';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          返回
        </button>
        <h1 className="text-2xl font-bold text-gray-800">用户详情</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex justify-between">
          <h2 className="text-lg font-semibold">基本信息</h2>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-sm border rounded-lg"
                >
                  取消
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm border rounded-lg">
                编辑
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* 姓名 */}
          <div>
            <span className="text-gray-400">姓名</span>
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="block mt-1 px-2 py-1 border rounded w-full"
              />
            ) : (
              <p className="mt-1 font-medium">{user.name}</p>
            )}
          </div>

          {/* 邮箱 */}
          <div>
            <span className="text-gray-400">邮箱</span>
            {editing ? (
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="block mt-1 px-2 py-1 border rounded w-full"
              />
            ) : (
              <p className="mt-1 font-medium">{user.email}</p>
            )}
          </div>

          {/* 新密码 — 仅编辑模式 */}
          {editing && (
            <div>
              <span className="text-gray-400">新密码（留空不修改）</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="留空不修改"
                className="block mt-1 px-2 py-1 border rounded w-full"
              />
            </div>
          )}

          {/* 会员身份 */}
          <div>
            <span className="text-gray-400">会员身份</span>
            {editing ? (
              <select
                value={form.variantName}
                onChange={(e) => setForm({ ...form, variantName: e.target.value })}
                className="block mt-1 px-2 py-1 border rounded w-full"
              >
                {VARIANTS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            ) : (
              <p className="mt-1 font-medium capitalize">{currentVariant}</p>
            )}
          </div>

          {/* 到期时间 */}
          <div>
            <span className="text-gray-400">到期时间</span>
            {editing ? (
              <input
                type="date"
                value={form.currentPeriodEnd}
                onChange={(e) => setForm({ ...form, currentPeriodEnd: e.target.value })}
                disabled={isFree}
                className="block mt-1 px-2 py-1 border rounded w-full disabled:opacity-30"
              />
            ) : (
              <p className="mt-1 font-medium">
                {user.subscription?.currentPeriodEnd
                  ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString('zh-CN')
                  : '-'}
              </p>
            )}
          </div>

          {/* 日限额 */}
          <div>
            <span className="text-gray-400">日限额（留空使用方案默认值）</span>
            {editing ? (
              <input
                type="number"
                value={form.dailyLimit}
                onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })}
                placeholder="使用方案默认值"
                className="block mt-1 px-2 py-1 border rounded w-full"
              />
            ) : (
              <p className="mt-1 font-medium">
                {user.dailyLimit !== null ? user.dailyLimit : '默认'}
              </p>
            )}
          </div>

          {/* 只读字段 */}
          <div>
            <span className="text-gray-400">注册时间</span>
            <p className="mt-1 font-medium">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</p>
          </div>
          <div>
            <span className="text-gray-400">消息数</span>
            <p className="mt-1 font-medium">{user.messageCount}</p>
          </div>
        </div>

        {/* 删除按钮 */}
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            删除用户
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="确认删除"
        confirmLabel="删除"
        message={`确定要删除用户 "${user.name}" 吗？此操作将删除该用户的所有对话、消息和订阅数据，不可撤销。`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
