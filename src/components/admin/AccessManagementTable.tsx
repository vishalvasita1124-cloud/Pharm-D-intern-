import { useState } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { revokeAccess, restoreAccess } from '@/lib/admin';
import type { AdminUserAccess } from '@/types';

interface Props {
  accessList: AdminUserAccess[];
  onRefresh: () => void;
}

function AccessRow({ record, onRefresh }: { record: AdminUserAccess; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleToggle = async () => {
    setLoading(true); setErr('');
    const fn = record.status === 'active' ? revokeAccess : restoreAccess;
    const { error } = await fn(record.id);
    setLoading(false);
    if (error) setErr(error);
    else onRefresh();
  };

  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-navy text-sm">{record.user_name ?? '—'}</p>
        <p className="text-gray-400 text-xs">{record.user_email}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-700">{record.product_title}</p>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-gray-400">{record.order_number}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-400">
          {new Date(record.granted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </td>
      <td className="px-4 py-3">
        {record.status === 'active' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <XCircle className="w-3 h-3" /> Revoked
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div>
          <button
            id={`access-toggle-${record.id}`}
            onClick={handleToggle}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50
              ${record.status === 'active'
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : record.status === 'active'
                ? <XCircle className="w-3.5 h-3.5" />
                : <CheckCircle2 className="w-3.5 h-3.5" />
            }
            {record.status === 'active' ? 'Revoke' : 'Restore'}
          </button>
          {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
        </div>
      </td>
    </tr>
  );
}

export function AccessManagementTable({ accessList, onRefresh }: Props) {
  if (accessList.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
        No access records yet. Approve orders to grant access.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Granted</span>
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
          </tr>
        </thead>
        <tbody>
          {accessList.map((record) => (
            <AccessRow key={record.id} record={record} onRefresh={onRefresh} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
