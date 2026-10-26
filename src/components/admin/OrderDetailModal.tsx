import { useState } from 'react';
import {
  X,
  User,
  Package,
  CreditCard,
  Hash,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import type { AdminOrder } from '@/types';

interface OrderDetailModalProps {
  order: AdminOrder;
  onClose: () => void;
  onApprove: (orderId: string) => Promise<void>;
  onReject: (orderId: string, reason: string) => Promise<void>;
}

export function OrderDetailModal({ order, onClose, onApprove, onReject }: OrderDetailModalProps) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    try {
      await onApprove(order.id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to approve order');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const finalReason = rejectReason.trim() || 'Payment not received in account';
    setLoading(true);
    setError('');
    try {
      await onReject(order.id, finalReason);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reject order');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { icon: <Hash className="w-4 h-4 text-gray-400" />, label: 'Order Number', value: order.order_number },
    { icon: <User className="w-4 h-4 text-gray-400" />, label: 'Customer', value: `${order.user_name || order.customer_name || 'Guest'} (${order.user_email || order.customer_email || 'No email'})` },
    ...(order.customer_mobile ? [{ icon: <User className="w-4 h-4 text-gray-400" />, label: 'Customer Mobile', value: order.customer_mobile }] : []),
    { icon: <Package className="w-4 h-4 text-gray-400" />, label: 'Product', value: order.product_title },
    { icon: <CreditCard className="w-4 h-4 text-gray-400" />, label: 'Amount', value: `₹${order.amount} INR` },
    { icon: <Hash className="w-4 h-4 text-gray-400" />, label: 'Payment / UTR', value: order.utr_number || '—' },
    {
      icon: <Calendar className="w-4 h-4 text-gray-400" />,
      label: 'Order Date',
      value: new Date(order.created_at).toLocaleString('en-IN'),
    },
  ];

  if (order.rejection_reason) {
    fields.push({
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
      label: 'Rejection Reason',
      value: order.rejection_reason,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-navy">Order Details</h2>
            <p className="text-gray-400 text-xs mt-0.5">{order.order_number}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {fields.map((f) => (
            <div key={f.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="mt-0.5">{f.icon}</div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{f.label}</p>
                <p className="text-sm font-semibold text-navy break-all">{f.value}</p>
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

        </div>

          {/* Footer actions */}
        {order.status !== 'rejected' && order.status !== 'cancelled' && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-3 bg-gray-50/50">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {rejecting && (
              <div className="space-y-2 p-3 bg-white border border-red-100 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-navy uppercase tracking-wider">
                    Rejection Reason
                  </label>
                  <span className="text-[11px] text-gray-400">Select preset or edit below</span>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Payment not received in account',
                    'Invalid UTR / transaction ID',
                    'Incorrect amount paid',
                    'Order cancelled by customer',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReason(preset)}
                      className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                        rejectReason === preset
                          ? 'bg-red-600 text-white border-red-600 font-semibold shadow-xs'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 resize-none bg-white"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 justify-end">
              {rejecting ? (
                <>
                  <button
                    onClick={() => { setRejecting(false); setRejectReason(''); setError(''); }}
                    className="btn-secondary text-xs px-3.5 py-2"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    id={`modal-confirm-reject-${order.id}`}
                    onClick={handleReject}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-all shadow-xs"
                  >
                    {loading ? <Spinner size="sm" /> : <XCircle className="w-4 h-4" />}
                    Confirm Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    id={`modal-reject-btn-${order.id}`}
                    onClick={() => {
                      setRejecting(true);
                      setRejectReason('Payment not received in account');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Order
                  </button>
                  {order.status !== 'approved' && (
                    <button
                      id={`modal-approve-btn-${order.id}`}
                      onClick={handleApprove}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-xs"
                    >
                      {loading ? <Spinner size="sm" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve Payment
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
