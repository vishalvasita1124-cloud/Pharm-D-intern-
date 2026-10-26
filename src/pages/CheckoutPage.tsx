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
  Send,
  Loader2,
  MessageCircle,
  Mail,
  User,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProductById } from '@/lib/notes';
import { createGuestOrder, submitUTR, getSiteSettings, checkUserAccess } from '@/lib/orders';
import { sendOrderEmail } from '@/lib/admin';
import { UpiPaymentBox } from '@/components/checkout/UpiPaymentBox';
import { Spinner } from '@/components/ui/Spinner';
import type { Order, Product } from '@/types';

type Step = 'loading' | 'guest_info' | 'payment' | 'utr' | 'error';

interface GuestInfo {
  name: string;
  email: string;
  mobile: string;
}

export default function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Guest info
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '', mobile: '' });
  const [guestErrors, setGuestErrors] = useState<Partial<GuestInfo>>({});
  const [guestSubmitting, setGuestSubmitting] = useState(false);

  // UTR
  const [utr, setUtr] = useState('');
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrError, setUtrError] = useState('');

  const [pageError, setPageError] = useState('');

  /** Load product + settings. All users must fill contact info form. */
  const init = useCallback(async () => {
    if (!productId) {
      setStep('error');
      setPageError('Invalid product link.');
      return;
    }

    const { data: prod, error: prodErr } = await getProductById(productId);
    if (prodErr || !prod) {
      setStep('error');
      setPageError('Product not found.');
      return;
    }
    setProduct(prod);

    const settingsRes = await getSiteSettings();
    if (settingsRes.data) setSettings(settingsRes.data);

    if (user) {
      // Logged-in: check if already owns product
      const accessRes = await checkUserAccess(productId);
      if (accessRes.hasAccess) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Pre-fill the contact form with profile data, then show form
      setGuestInfo({
        name: profile?.full_name || '',
        email: profile?.email || user.email || '',
        mobile: profile?.mobile || '',
      });
    }

    // Everyone must confirm contact details before payment
    setStep('guest_info');
  }, [productId, user, profile, navigate]);

  useEffect(() => { init(); }, [init]);

  /** Validate & submit guest info, then create order */
  const handleGuestInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Partial<GuestInfo> = {};
    if (!guestInfo.name.trim()) errors.name = 'Full name is required';
    if (!guestInfo.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email))
      errors.email = 'Valid email is required';
    if (!guestInfo.mobile.trim() || !/^\d{10}$/.test(guestInfo.mobile.replace(/\s/g, '')))
      errors.mobile = 'Valid 10-digit mobile number is required';

    if (Object.keys(errors).length > 0) {
      setGuestErrors(errors);
      return;
    }

    setGuestSubmitting(true);
    setGuestErrors({});

    const { data: ord, error: ordErr } = await createGuestOrder(
      productId!,
      guestInfo.email.trim(),
      guestInfo.name.trim(),
      guestInfo.mobile.trim()
    );

    if (ordErr || !ord) {
      setGuestSubmitting(false);
      setGuestErrors({ email: ordErr ?? 'Failed to create order. Please try again.' });
      return;
    }

    setOrder(ord);
    setGuestSubmitting(false);

    if (ord.status === 'pending_verification' || ord.status === 'approved') {
      navigate(`/orders/${ord.id}`, { replace: true });
      return;
    }

    setStep('payment');
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const trimmed = utr.trim();
    // UTR is optional — submit with empty string if not provided
    setUtrSubmitting(true);
    setUtrError('');

    const { error } = await submitUTR(order.id, trimmed || 'PENDING');
    if (error) {
      setUtrError(error);
      setUtrSubmitting(false);
      return;
    }

    sendOrderEmail('payment_received', order.id);
    navigate(`/orders/${order.id}`);
  };

  if (!product && step !== 'loading' && step !== 'guest_info' && step !== 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Product not found.</p>
          <Link to="/notes" className="btn-primary mt-4 inline-flex">Browse Notes</Link>
        </div>
      </div>
    );
  }

  const safeProduct = product!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-8">
        <div className="container-custom">
          {safeProduct && (
            <Link
              to={`/notes/${safeProduct.slug}`}
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {safeProduct.title}
            </Link>
          )}
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

        {/* ── Loading ── */}
        {step === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {/* ── Error ── */}
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

        {/* ── Guest Info Form ── */}
        {step === 'guest_info' && safeProduct && (
          <div className="max-w-lg mx-auto space-y-6">

            {/* Product mini card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-medical-800 to-teal-700 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy leading-snug text-sm">{safeProduct.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" />{safeProduct.category?.name}
                </p>
              </div>
              <p className="text-2xl font-extrabold text-navy shrink-0">&#8377;{safeProduct.price}</p>
            </div>

            {/* WhatsApp receipt instruction */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-full text-[11px] font-bold uppercase tracking-wider mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Important — After Payment
                  </div>
                  <h3 className="font-bold text-navy text-sm sm:text-base leading-snug">
                    Share your payment screenshot on WhatsApp to unlock access instantly
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                    After completing your UPI payment, send a <strong>screenshot of your payment receipt</strong> along with the notes name to our WhatsApp number. Your notes will be activated within minutes.
                  </p>
                  <a
                    href={`https://wa.me/91${(settings.upi_mobile || '9512184197').replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I have completed the payment. Here is my payment receipt screenshot:')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    WhatsApp: +91 {settings.upi_mobile || '9512184197'}
                  </a>
                </div>
              </div>
            </div>

            {/* Info form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-navy mb-1 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" />
                Your Contact Details
              </h2>
              <p className="text-gray-500 text-sm mb-5">
                We need these to send your purchase confirmation and help you access the notes.
              </p>

              <form onSubmit={handleGuestInfoSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="guest-name" className="block text-sm font-medium text-navy mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="guest-name"
                      type="text"
                      value={guestInfo.name}
                      onChange={(e) => { setGuestInfo(p => ({ ...p, name: e.target.value })); setGuestErrors(p => ({ ...p, name: '' })); }}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                    />
                  </div>
                  {guestErrors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{guestErrors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="guest-email" className="block text-sm font-medium text-navy mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="guest-email"
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) => { setGuestInfo(p => ({ ...p, email: e.target.value })); setGuestErrors(p => ({ ...p, email: '' })); }}
                      placeholder="e.g. rahul@example.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                    />
                  </div>
                  {guestErrors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{guestErrors.email}</p>}
                </div>

                {/* Mobile */}
                <div>
                  <label htmlFor="guest-mobile" className="block text-sm font-medium text-navy mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="guest-mobile"
                      type="tel"
                      value={guestInfo.mobile}
                      onChange={(e) => { setGuestInfo(p => ({ ...p, mobile: e.target.value })); setGuestErrors(p => ({ ...p, mobile: '' })); }}
                      placeholder="10-digit mobile number"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                      maxLength={10}
                    />
                  </div>
                  {guestErrors.mobile && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{guestErrors.mobile}</p>}
                </div>

                <button
                  id="guest-info-submit"
                  type="submit"
                  disabled={guestSubmitting}
                  className="btn-primary w-full mt-2"
                >
                  {guestSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating Order&hellip;</>
                  ) : (
                    <><ShoppingCart className="w-4 h-4" /> Continue to Payment</>
                  )}
                </button>
              </form>

              {!user && (
                <p className="text-center text-xs text-gray-400 mt-4">
                  Already have an account?{' '}
                  <Link to={`/login?redirect=/checkout/${productId}`} className="text-teal-600 hover:underline font-medium">
                    Sign In
                  </Link>
                </p>
              )}
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Secure checkout &mdash; your data is safe with us</span>
            </div>
          </div>
        )}

        {/* ── Summary / Payment / UTR steps ── */}
        {/* ── Payment / UTR steps ── */}
        {(step === 'payment' || step === 'utr') && order && safeProduct && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              {[
                { key: 'payment', label: '1. Order & UPI Payment' },
                { key: 'utr', label: '2. Confirm Payment' },
              ].map((s, i, arr) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span
                    className={
                      step === s.key
                        ? 'text-medical-700'
                        : step === 'utr' && s.key === 'payment'
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    }
                  >
                    {step === 'utr' && s.key === 'payment' ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {s.label}
                      </span>
                    ) : s.label}
                  </span>
                  {i < arr.length - 1 && <span className="text-gray-300">&rarr;</span>}
                </div>
              ))}
            </div>

            {/* Order Summary Card */}
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
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{safeProduct.pages} pages</span>
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{safeProduct.category?.name}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-extrabold text-navy">&#8377;{safeProduct.price}</p>
                  <p className="text-xs text-gray-400">one-time</p>
                </div>
              </div>

              {/* Buyer info pill */}
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-5">
                <User className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="text-sm text-teal-800 min-w-0">
                  <span className="font-semibold">{user ? (profile?.full_name || user.email) : guestInfo.name}</span>
                  <span className="text-teal-600 ml-2 text-xs">
                    {user ? (profile?.email || user.email) : guestInfo.email}
                  </span>
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                {['Lifetime PDF access', 'Printable & mobile-friendly', 'Future updates included'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />{item}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="font-bold text-navy">Total</span>
                <span className="text-2xl font-extrabold text-navy">&#8377;{order.amount}</span>
              </div>
            </div>

            {/* ── UPI Payment Box + UTR Form ── */}
            {(step === 'payment' || step === 'utr') && (
              <>
                {/* ── Clear WhatsApp Receipt & Course Name Instruction (Right before Payment Form) ── */}
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <MessageCircle className="w-5 h-5 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-200/80 text-emerald-950 rounded-full text-[11px] font-bold uppercase tracking-wider mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                        Important: Action Required After Payment
                      </div>
                      <h3 className="font-extrabold text-navy text-sm sm:text-base leading-snug">
                        Share your payment receipt &amp; notes name on WhatsApp for instant unlock
                      </h3>
                      <p className="text-gray-700 text-xs sm:text-sm mt-1.5 leading-relaxed">
                        Immediately after making payment via QR or Mobile Number below, please share a screenshot of your <strong>Payment Receipt</strong> along with the notes title (<strong>&ldquo;{safeProduct.title}&rdquo;</strong>) to our WhatsApp number. Your notes access will be activated within minutes!
                      </p>

                      <div className="mt-3.5 flex flex-wrap items-center gap-3">
                        <a
                          href={`https://wa.me/91${(settings.upi_mobile || '9512184197').replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hi, I have completed the payment of ₹${order.amount} for "${safeProduct.title}" (Order: ${order.order_number}). Here is my payment receipt screenshot:`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                          Share on WhatsApp (+91 {settings.upi_mobile || '9512184197'})
                        </a>
                        <span className="text-xs text-gray-500 font-medium">
                          +91 {settings.upi_mobile || '9512184197'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <UpiPaymentBox
                  upiId={settings.upi_id || 'vasita.vishal@axl'}
                  upiName={settings.upi_name || 'Vishal Vasita'}
                  amount={order.amount}
                  orderNumber={order.order_number}
                  upiMobile={settings.upi_mobile || '9512184197'}
                  qrImageUrl={settings.upi_qr_url}
                />

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-navy mb-2 flex items-center gap-2">
                    <Send className="w-5 h-5 text-teal-600" />
                    Confirm Payment Sent
                  </h2>
                  <p className="text-gray-500 text-sm mb-5">
                    Once you have completed the payment of <strong>₹{order?.amount}</strong>, tap the button below to notify us. Optionally add your UTR / transaction reference to help us verify faster.
                  </p>

                  <form onSubmit={handleUtrSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="utr-input" className="block text-sm font-medium text-navy mb-1.5">
                        UTR Number <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <input
                        id="utr-input"
                        type="text"
                        value={utr}
                        onChange={(e) => { setUtr(e.target.value); setUtrError(''); }}
                        placeholder="e.g. 123456789012 (leave blank if unsure)"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                        autoComplete="off"
                      />
                      {utrError && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />{utrError}
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-1.5">
                        Find UTR in your UPI app &rarr; Transaction History &rarr; last payment details
                      </p>
                    </div>

                    <button
                      id="submit-utr-btn"
                      type="submit"
                      disabled={utrSubmitting}
                      className="btn-teal w-full"
                    >
                      {utrSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting&hellip;</>
                      ) : (
                        <><Send className="w-4 h-4" /> I&apos;ve Paid &mdash; Notify Admin</>
                      )}
                    </button>
                  </form>
                </div>

                {/* Help / Support Box */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <p className="font-bold text-navy text-sm">Need help with your payment?</p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        Facing any payment issue? Message us on WhatsApp or Email for instant assistance.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <a
                      href="https://wa.me/919512184197?text=Hi%2C%20I%20need%20help%20with%20my%20payment%20on%20Pharm%20D%20Intern%20Notes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      WhatsApp Help
                    </a>
                    <a
                      href="mailto:pharmdintern01@gmail.com"
                      className="inline-flex items-center justify-center p-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-colors"
                      title="Email Support"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
