import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Tag,
  Lock,
  Smartphone,
  CreditCard,
  Send,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProductById } from '@/lib/notes';
import { createOrder, submitUTR, getSiteSettings, checkUserAccess } from '@/lib/orders';
import { UpiPaymentBox } from '@/components/checkout/UpiPaymentBox';
import { Spinner } from '@/components/ui/Spinner';
import type { Order, Product } from '@/types';

type Step = 'loading' | 'summary' | 'payment' | 'utr' | 'error';

export default function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [utr, setUtr] = useState('');
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrError, setUtrError] = useState('');
  const [pageError, setPageError] = useState('');
  const [paymentMethod] = useState<'upi'>('upi');

  const init = useCallback(async () => {
    if (!productId || !user) {
      setStep('error');
      setPageError('Product not found or not authenticated.');
      return;
    }

    // Fetch product from Supabase
    const { data: prod, error: prodErr } = await getProductById(productId);
    if (prodErr || !prod) {
      setStep('error');
      setPageError('Product not found.');
      return;
    }
    setProduct(prod);

    // Fetch settings + check access in parallel
    const [settingsRes, accessRes] = await Promise.all([
      getSiteSettings(),
      checkUserAccess(productId),
    ]);

    if (settingsRes.data) setSettings(settingsRes.data);

    // Already owns this
    if (accessRes.hasAccess) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Create (or retrieve) order
    const { data: ord, error: ordErr } = await createOrder(productId);
    if (ordErr || !ord) {
      setStep('error');
      setPageError(ordErr ?? 'Failed to create order.');
      return;
    }

    setOrder(ord);

    // If UTR already submitted, go straight to status page
    if (ord.status === 'pending_verification' || ord.status === 'approved') {
      navigate(`/orders/${ord.id}`, { replace: true });
      return;
    }

    setStep('summary');
  }, [productId, user, navigate]);

  useEffect(() => {
    init();
  }, [init]);

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const trimmed = utr.trim();
    if (!trimmed) {
      setUtrError('Please enter your UTR number');
      return;
    }

    setUtrSubmitting(true);
    setUtrError('');

    const { error } = await submitUTR(order.id, trimmed);
    if (error) {
      setUtrError(error);
      setUtrSubmitting(false);
      return;
    }

    // Success — navigate to order status
    navigate(`/orders/${order.id}`);
  };

  if (!product && step !== 'loading' && step !== 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Product not found.</p>
          <Link to="/notes" className="btn-primary mt-4 inline-flex">Browse Notes</Link>
        </div>
      </div>
    );
  }

  // At this point, if step is summary/payment/utr, product is guaranteed non-null
  const safeProduct = product!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-8">
        <div className="container-custom">
          <Link
            to={`/notes/${safeProduct.slug}`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {safeProduct.title}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">Checkout</h1>
              {order && (
                <p className="text-white/50 text-xs font-mono">{order.order_number}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container-custom py-10">
        {step === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {step === 'error' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-red-100 p-8 text-center shadow-sm">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="font-bold text-navy text-lg mb-2">Something went wrong</h2>
              <p className="text-gray-500 text-sm mb-6">{pageError}</p>
              <Link to="/notes" className="btn-primary">Browse Notes</Link>
            </div>
          </div>
        )}

        {(step === 'summary' || step === 'payment' || step === 'utr') && order && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* ── Step indicator ─────────────────────────────────── */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              {[
                { key: 'summary', label: '1. Order Summary' },
                { key: 'payment', label: '2. Payment' },
                { key: 'utr', label: '3. Submit UTR' },
              ].map((s, i, arr) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span
                    className={
                      step === s.key
                        ? 'text-medical-700'
                        : ['summary', 'payment', 'utr'].indexOf(step) > i
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    }
                  >
                    {step !== s.key && ['summary', 'payment', 'utr'].indexOf(step) > i ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {s.label}
                      </span>
                    ) : s.label}
                  </span>
                  {i < arr.length - 1 && <span className="text-gray-300">→</span>}
                </div>
              ))}
            </div>

            {/* ── Order Summary Card ──────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-navy mb-5 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Order Summary
              </h2>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl mb-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-medical-800 to-teal-700 flex items-center justify-center shrink-0">
                  <FileText className="w-7 h-7 text-white/80" />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="font-bold text-navy leading-snug mb-1">{safeProduct.title}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {safeProduct.pages} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {safeProduct.category?.name}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-extrabold text-navy">₹{safeProduct.price}</p>
                  <p className="text-xs text-gray-400">one-time</p>
                </div>
              </div>

              {/* Inclusions */}
              <ul className="space-y-2 mb-5">
                {['Lifetime PDF access', 'Printable & mobile-friendly', 'Future updates included'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="font-bold text-navy">Total</span>
                <span className="text-2xl font-extrabold text-navy">₹{order.amount}</span>
              </div>
            </div>

            {/* ── Payment Method ──────────────────────────────────── */}
            {step === 'summary' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-navy mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-teal-600" />
                  Payment Method
                </h2>

                <div className="grid gap-3">
                  {/* UPI option */}
                  <label className="flex items-center gap-4 p-4 border-2 border-teal-500 bg-teal-50 rounded-xl cursor-pointer">
                    <input type="radio" name="method" value="upi" defaultChecked className="accent-teal-600" />
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-navy text-sm">Manual UPI</p>
                        <p className="text-xs text-gray-500">Scan QR or pay via UPI ID — submit UTR to confirm</p>
                      </div>
                    </div>
                  </label>

                  {/* Razorpay — disabled */}
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl opacity-50 cursor-not-allowed">
                    <input type="radio" name="method" value="razorpay" disabled className="accent-blue-500" />
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-navy text-sm">Razorpay</p>
                        <p className="text-xs text-gray-500">Coming in Stage 4</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                  Your order is secure and encrypted
                </div>

                <button
                  id="proceed-to-payment"
                  onClick={handleProceedToPayment}
                  className="btn-primary w-full mt-6"
                >
                  <Smartphone className="w-4 h-4" />
                  Proceed to Pay ₹{order.amount}
                </button>
              </div>
            )}

            {/* ── UPI Payment Box ─────────────────────────────────── */}
            {(step === 'payment' || step === 'utr') && (
              <>
                <UpiPaymentBox
                  upiId={settings.upi_id ?? 'pharmdinterns@upi'}
                  upiName={settings.upi_name ?? 'Pharm D Intern Notes'}
                  amount={order.amount}
                  orderNumber={order.order_number}
                />

                {/* UTR Form */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-navy mb-2 flex items-center gap-2">
                    <Send className="w-5 h-5 text-teal-600" />
                    Submit Payment Reference
                  </h2>
                  <p className="text-gray-500 text-sm mb-5">
                    After completing the payment, enter the UTR / transaction reference number from your UPI app.
                  </p>

                  <form onSubmit={handleUtrSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="utr-input" className="block text-sm font-medium text-navy mb-1.5">
                        UTR Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="utr-input"
                        type="text"
                        value={utr}
                        onChange={(e) => { setUtr(e.target.value); setUtrError(''); }}
                        placeholder="e.g. 123456789012"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                        autoComplete="off"
                      />
                      {utrError && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {utrError}
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-1.5">
                        Find UTR in your UPI app → Transaction History → last payment details
                      </p>
                    </div>

                    <button
                      id="submit-utr-btn"
                      type="submit"
                      disabled={utrSubmitting || !utr.trim()}
                      className="btn-teal w-full"
                    >
                      {utrSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit for Verification
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
