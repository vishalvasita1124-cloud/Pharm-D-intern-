import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Hourglass,
  XCircle,
  ArrowRight,
  LayoutDashboard,
  BookOpen,
  RefreshCw,
  Hash,
  CreditCard,
  FileText,
  Send,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getOrderById, submitUTR, getSiteSettings } from '@/lib/orders';
import { UpiPaymentBox } from '@/components/checkout/UpiPaymentBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import type { Order } from '@/types';

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [resubmitMode, setResubmitMode] = useState(false);
  const [utr, setUtr] = useState('');
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrError, setUtrError] = useState('');

  const load = useCallback(async () => {
    if (!orderId) return;
    const [orderRes, settingsRes] = await Promise.all([
      getOrderById(orderId),
      getSiteSettings(),
    ]);
    if (orderRes.data) setOrder(orderRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResubmitUTR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const trimmed = utr.trim();
    if (!trimmed) { setUtrError('Please enter your UTR number'); return; }
    setUtrSubmitting(true);
    setUtrError('');
    const { error } = await submitUTR(order.id, trimmed);
    if (error) { setUtrError(error); setUtrSubmitting(false); return; }
    setResubmitMode(false);
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Order not found.</p>
          <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  const statusContent = {
    pending_payment: {
      icon: <Clock className="w-12 h-12 text-amber-500" />,
      bg: 'bg-amber-50 border-amber-200',
      title: 'Awaiting Your Payment',
      desc: 'Please complete the UPI payment and submit your UTR number below.',
    },
    pending_verification: {
      icon: <Hourglass className="w-12 h-12 text-blue-500" />,
      bg: 'bg-blue-50 border-blue-200',
      title: 'Payment Under Review',
      desc: 'We have received your UTR and are verifying the payment. This usually takes a few hours.',
    },
    approved: {
      icon: <CheckCircle2 className="w-12 h-12 text-emerald-500" />,
      bg: 'bg-emerald-50 border-emerald-200',
      title: 'Payment Approved! 🎉',
      desc: 'Your payment has been verified. You now have access to your notes.',
    },
    rejected: {
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      bg: 'bg-red-50 border-red-200',
      title: 'Payment Rejected',
      desc: order.rejection_reason ?? 'Your payment could not be verified. Please re-submit the correct UTR.',
    },
    cancelled: {
      icon: <XCircle className="w-12 h-12 text-gray-400" />,
      bg: 'bg-gray-50 border-gray-200',
      title: 'Order Cancelled',
      desc: 'This order has been cancelled.',
    },
  };

  const sc = statusContent[order.status] ?? statusContent.cancelled;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-8">
        <div className="container-custom">
          <div className="flex items-center gap-3">
            <Hash className="w-5 h-5 text-white/60" />
            <div>
              <h1 className="text-xl font-extrabold text-white">Order Status</h1>
              <p className="text-white/50 text-xs font-mono">{order.order_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-10">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Status card */}
          <div className={`rounded-2xl border p-8 text-center ${sc.bg}`}>
            <div className="flex justify-center mb-4">{sc.icon}</div>
            <div className="flex justify-center mb-3">
              <StatusBadge status={order.status} />
            </div>
            <h2 className="text-xl font-extrabold text-navy mb-2">{sc.title}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{sc.desc}</p>
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <h3 className="font-bold text-navy text-sm">Order Details</h3>
            {[
              { icon: <Hash className="w-4 h-4 text-gray-400" />, label: 'Order', value: order.order_number },
              { icon: <FileText className="w-4 h-4 text-gray-400" />, label: 'Product', value: order.product_title },
              { icon: <CreditCard className="w-4 h-4 text-gray-400" />, label: 'Amount', value: `₹${order.amount}` },
              {
                icon: <Hash className="w-4 h-4 text-gray-400" />,
                label: 'UTR Submitted',
                value: order.utr_number ?? '—',
              },
              {
                icon: <Clock className="w-4 h-4 text-gray-400" />,
                label: 'Placed On',
                value: new Date(order.created_at).toLocaleString('en-IN'),
              },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {f.icon}
                <span className="text-xs text-gray-400 w-28 shrink-0">{f.label}</span>
                <span className="text-sm font-medium text-navy break-all">{f.value}</span>
              </div>
            ))}
          </div>

          {/* Show payment box for pending_payment status */}
          {order.status === 'pending_payment' && (
            <>
              <UpiPaymentBox
                upiId={settings.upi_id ?? 'pharmdinterns@upi'}
                upiName={settings.upi_name ?? 'Pharm D Intern Notes'}
                amount={order.amount}
                orderNumber={order.order_number}
              />
              {/* UTR form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-navy mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-teal-600" />
                  Submit UTR Number
                </h3>
                <form onSubmit={handleResubmitUTR} className="space-y-4">
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => { setUtr(e.target.value); setUtrError(''); }}
                    placeholder="Enter UTR / transaction reference"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                  />
                  {utrError && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{utrError}
                    </p>
                  )}
                  <button type="submit" disabled={utrSubmitting || !utr.trim()} className="btn-teal w-full">
                    {utrSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Send className="w-4 h-4" />Submit for Verification</>}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Re-submit UTR for rejected orders */}
          {order.status === 'rejected' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {!resubmitMode ? (
                <button
                  id="resubmit-utr-btn"
                  onClick={() => setResubmitMode(true)}
                  className="btn-primary w-full"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-submit Payment
                </button>
              ) : (
                <form onSubmit={handleResubmitUTR} className="space-y-4">
                  <h3 className="font-bold text-navy flex items-center gap-2">
                    <Send className="w-5 h-5 text-teal-600" />
                    Re-submit UTR Number
                  </h3>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => { setUtr(e.target.value); setUtrError(''); }}
                    placeholder="Enter correct UTR number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                  />
                  {utrError && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{utrError}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setResubmitMode(false)} className="btn-secondary flex-1">Cancel</button>
                    <button type="submit" disabled={utrSubmitting} className="btn-teal flex-1">
                      {utrSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Submit
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {order.status === 'approved' ? (
              <Link to="/dashboard" id="go-to-dashboard-btn" className="btn-primary flex-1 justify-center">
                <LayoutDashboard className="w-4 h-4" />
                Go to My Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/dashboard/orders" className="btn-secondary flex-1 justify-center">
                  <LayoutDashboard className="w-4 h-4" />
                  My Orders
                </Link>
                <Link to="/notes" className="btn-secondary flex-1 justify-center">
                  <BookOpen className="w-4 h-4" />
                  Browse More Notes
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
