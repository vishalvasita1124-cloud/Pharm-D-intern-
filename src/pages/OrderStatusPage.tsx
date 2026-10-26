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
  MessageCircle,
  Eye,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrderById, submitUTR, getSiteSettings } from '@/lib/orders';
import { UpiPaymentBox } from '@/components/checkout/UpiPaymentBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import type { Order } from '@/types';

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
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
    // UTR is optional — submit with PENDING if not provided
    setUtrSubmitting(true);
    setUtrError('');
    const { error } = await submitUTR(order.id, trimmed || 'PENDING');
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

          {/* WhatsApp Receipt Instruction for pending verification or payment */}
          {order.status !== 'approved' && order.status !== 'cancelled' && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-200/80 text-emerald-950 rounded-full text-[11px] font-bold uppercase tracking-wider mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    Important: Fast-Track Note Activation
                  </div>
                  <h3 className="font-extrabold text-navy text-sm sm:text-base leading-snug">
                    Share Payment Receipt &amp; Notes Name on WhatsApp
                  </h3>
                  <p className="text-gray-700 text-xs sm:text-sm mt-1.5 leading-relaxed">
                    To unlock your notes immediately, please send a screenshot of your <strong>Payment Receipt</strong> along with the notes title (<strong>&ldquo;{order.product_title}&rdquo;</strong>) to our WhatsApp number. Your notes will be activated right away:
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-3">
                    <a
                      href={`https://wa.me/91${(settings.upi_mobile || '9512184197').replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hi, I have completed the payment of ₹${order.amount} for "${order.product_title}" (Order: ${order.order_number}). Here is my payment receipt screenshot:`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      Send Receipt on WhatsApp (+91 {settings.upi_mobile || '9512184197'})
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                upiId={settings.upi_id || 'vasita.vishal@axl'}
                upiName={settings.upi_name || 'Vishal Vasita'}
                amount={order.amount}
                orderNumber={order.order_number}
                upiMobile={settings.upi_mobile || '9512184197'}
                qrImageUrl={settings.upi_qr_url}
              />
              {/* UTR form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-navy mb-2 flex items-center gap-2">
                  <Send className="w-5 h-5 text-teal-600" />
                  Confirm Payment Sent
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Once you have paid <strong>&#8377;{order.amount}</strong>, tap below to notify us. UTR number is optional.
                </p>
                <form onSubmit={handleResubmitUTR} className="space-y-4">
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => { setUtr(e.target.value); setUtrError(''); }}
                    placeholder="UTR / transaction reference (optional)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                  />
                  {utrError && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{utrError}
                    </p>
                  )}
                  <button type="submit" disabled={utrSubmitting} className="btn-teal w-full">
                    {utrSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting&hellip;</> : <><Send className="w-4 h-4" />I&apos;ve Paid &mdash; Notify Admin</>}
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

          {/* Approved access banner */}
          {order.status === 'approved' && (
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-emerald-200 text-xs font-bold uppercase tracking-wider">Access Granted</span>
                  <h3 className="text-xl font-extrabold text-white">Your Notes are Ready!</h3>
                </div>
              </div>
              <p className="text-white/80 text-sm mb-6 leading-relaxed">
                Payment verified for <strong>&ldquo;{order.product_title}&rdquo;</strong>.
                {!user && order.customer_email && (
                  <> Log in with <strong>{order.customer_email}</strong> anytime to view all your notes in your dashboard, or read them directly now:</>
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={`/my-notes/${order.product_id}/view`}
                  id="view-approved-pdf-btn"
                  className="flex-1 py-3 px-5 rounded-xl bg-white text-teal-900 font-bold text-sm shadow-md hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4 text-teal-700" />
                  View &amp; Read PDF
                </Link>
                {!user ? (
                  <Link
                    to={`/login?email=${encodeURIComponent(order.customer_email || '')}`}
                    id="login-with-payment-email-btn"
                    className="flex-1 py-3 px-5 rounded-xl bg-white/15 border border-white/30 text-white font-bold text-sm hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Sign In with {order.customer_email ? order.customer_email.split('@')[0] : 'Email'}
                  </Link>
                ) : (
                  <Link
                    to="/my-notes"
                    className="flex-1 py-3 px-5 rounded-xl bg-white/15 border border-white/30 text-white font-bold text-sm hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    My Notes Library
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* CTAs */}
          {order.status !== 'approved' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/dashboard/orders" className="btn-secondary flex-1 justify-center">
                <LayoutDashboard className="w-4 h-4" />
                My Orders
              </Link>
              <Link to="/notes" className="btn-secondary flex-1 justify-center">
                <BookOpen className="w-4 h-4" />
                Browse More Notes
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
