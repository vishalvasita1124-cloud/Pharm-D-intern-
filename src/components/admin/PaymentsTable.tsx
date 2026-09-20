import { useState } from 'react';
import { CheckCircle2, XCircle, Eye, User, Package, CreditCard, Search } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import type { AdminOrder } from '@/types';

interface PaymentsTableProps {
  orders: AdminOrder[];
  loading: boolean;
  onApprove: (orderId: string) => Promise<void>;
  onReject: (orderId: string) => void;
  onViewDetail: (order: AdminOrder) => void;
}

export function PaymentsTable({
  orders,
  loading,
  onApprove,
  onReject,
  onViewDetail,
}: PaymentsTableProps) {
  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.user_email ?? '').toLowerCase().includes(q) ||
      (o.user_name ?? '').toLowerCase().includes(q) ||
      o.product_title.toLowerCase().includes(q) ||
      (o.utr_number ?? '').toLowerCase().includes(q)
    );
  });

  const handleApprove = async (orderId: string) => {
    setApprovingId(orderId);
    try {
      await onApprove(orderId);
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by order#, email, name, UTR…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No orders found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">UTR</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => (
                <tr key={order.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                  {/* Order */}
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-navy text-xs">{order.order_number}</span>
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-medical-100 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-medical-600" />
                      </div>
                      <div>
                        <p className="font-medium text-navy text-xs">{order.user_name || '—'}</p>
                        <p className="text-gray-400 text-xs">{order.user_email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Product */}
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="text-navy text-xs font-medium line-clamp-2">{order.product_title}</p>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-navy font-bold text-xs">
                      <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                      ₹{order.amount}
                    </div>
                  </td>

                  {/* UTR */}
                  <td className="px-4 py-3">
                    {order.utr_number ? (
                      <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-navy">
                        {order.utr_number}
                      </code>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`view-order-${order.id}`}
                        onClick={() => onViewDetail(order)}
                        title="View details"
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {order.status === 'pending_verification' && (
                        <>
                          <button
                            id={`approve-order-${order.id}`}
                            onClick={() => handleApprove(order.id)}
                            disabled={approvingId === order.id}
                            title="Approve"
                            className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                          >
                            {approvingId === order.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            id={`reject-order-${order.id}`}
                            onClick={() => onReject(order.id)}
                            title="Reject"
                            className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
