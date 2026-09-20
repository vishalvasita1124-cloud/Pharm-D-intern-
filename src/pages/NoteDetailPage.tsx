import { useParams, Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Tag,
  BookOpen,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Share2,
  Bookmark,
  Stethoscope,
  FlaskConical,
  Hourglass,
  LogIn,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { clsx } from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { checkUserAccess, getActiveOrderForProduct } from '@/lib/orders';
import { getProductBySlug } from '@/lib/notes';
import { useEffect, useState } from 'react';
import type { OrderStatus, Product } from '@/types';

function CoverDisplay({ product }: { product: Product }) {
  if (product.cover_url) {
    return (
      <img
        src={product.cover_url}
        alt={`Cover for ${product.title}`}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-medical-800 to-teal-700 flex flex-col items-center justify-center">
      {product.category?.slug?.includes('research')
        ? <FlaskConical className="w-24 h-24 text-white/70" />
        : product.category?.slug?.includes('pharmacy')
        ? <Stethoscope className="w-24 h-24 text-white/70" />
        : <BookOpen className="w-24 h-24 text-white/70" />
      }
      <p className="text-white/60 text-sm mt-4 text-center px-6">{product.title}</p>
    </div>
  );
}

function usePurchaseState(productId: string | undefined) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user || !productId) { setChecking(false); return; }
    Promise.all([
      checkUserAccess(productId),
      getActiveOrderForProduct(productId),
    ]).then(([accessRes, orderRes]) => {
      setHasAccess(accessRes.hasAccess);
      if (orderRes.data) {
        setOrderStatus(orderRes.data.status);
        setOrderId(orderRes.data.id);
      }
      setChecking(false);
    });
  }, [user, productId]);

  return { user, hasAccess, orderStatus, orderId, checking };
}

export default function NoteDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getProductBySlug(slug).then(({ data }) => {
      if (!data) setNotFound(true);
      else setProduct(data);
      setLoadingProduct(false);
    });
  }, [slug]);

  const { user, hasAccess, orderStatus, orderId, checking } = usePurchaseState(product?.id);

  if (loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !product) return <Navigate to="/notes" replace />;

  const categoryName = product.category?.name ?? '';
  const hasPdf = !!product.file_path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="container-custom py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-medical-700 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/notes" className="hover:text-medical-700 transition-colors">Notes</Link>
            <span>/</span>
            <span className="text-navy font-medium truncate max-w-xs">{product.title}</span>
          </div>
        </div>
      </div>

      <div className="container-custom py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Cover + quick info */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Cover */}
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-medical-900 mb-6">
                <CoverDisplay product={product} />
              </div>

              {/* Price card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-extrabold text-navy">₹{product.price}</span>
                  <span className="text-gray-400 text-sm">one-time</span>
                </div>
                <p className="text-gray-500 text-sm mb-5">Includes lifetime access &amp; future updates.</p>

                {/* Buy / Access state */}
                {checking ? (
                  <div className="w-full h-11 rounded-xl bg-gray-100 animate-pulse mb-3" />
                ) : hasAccess ? (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-emerald-700 text-xs font-semibold">Purchased — you own this note</p>
                    </div>
                    {hasPdf ? (
                      <Link
                        to={`/my-notes/${product.id}/view`}
                        id={`view-pdf-${product.slug}`}
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        View PDF
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        PDF coming soon
                      </div>
                    )}
                  </div>
                ) : orderStatus === 'pending_verification' ? (
                  <Link
                    to={`/orders/${orderId}`}
                    id={`view-order-${product.slug}`}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-all mb-3"
                  >
                    <Hourglass className="w-4 h-4" />
                    Payment Under Review — View Status
                  </Link>
                ) : orderStatus === 'pending_payment' ? (
                  <Link
                    to={`/orders/${orderId}`}
                    id={`resume-order-${product.slug}`}
                    className="btn-primary w-full mb-3"
                  >
                    <Clock className="w-4 h-4" />
                    Resume Order — Pay Now
                  </Link>
                ) : !user ? (
                  <Link
                    to={`/login?redirect=/checkout/${product.id}`}
                    id={`buy-now-${product.slug}`}
                    className="btn-primary w-full mb-3"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In to Purchase
                  </Link>
                ) : (
                  <Link
                    to={`/checkout/${product.id}`}
                    id={`buy-now-${product.slug}`}
                    className="btn-primary w-full mb-3"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Buy Now — ₹{product.price}
                  </Link>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    id={`share-${product.slug}`}
                    aria-label="Share this note"
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    id={`save-${product.slug}`}
                    aria-label="Save to wishlist"
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Bookmark className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Back */}
            <Link
              to="/notes"
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-medical-700 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Notes
            </Link>

            {/* Title + badge */}
            <div>
              <Badge variant="teal" className="mb-3">{categoryName}</Badge>
              <h1 className="text-3xl md:text-4xl font-extrabold text-navy leading-snug mb-4">
                {product.title}
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">{product.description}</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { icon: <FileText className="w-5 h-5" />, label: 'Pages', value: product.pages ? `${product.pages} pages` : 'PDF Guide' },
                { icon: <Tag className="w-5 h-5" />, label: 'Category', value: categoryName },
                { icon: <Clock className="w-5 h-5" />, label: 'Format', value: 'PDF Download' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 text-teal-600 mb-2">
                    {stat.icon}
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{stat.label}</span>
                  </div>
                  <div className="font-semibold text-navy text-sm">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Topics covered */}
            {product.topics.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-7">
                <h2 className="text-xl font-bold text-navy mb-5 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                  Topics Covered
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.topics.map((topic) => (
                    <div key={topic} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                      <span className="text-gray-700 text-sm leading-snug">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview/sample section */}
            <div className="bg-gradient-to-br from-medical-50 to-teal-50 rounded-2xl border border-medical-100 p-7">
              <h2 className="text-xl font-bold text-navy mb-3">Sample Preview</h2>
              <p className="text-gray-600 text-sm mb-5">
                Get a feel for the note quality and layout before purchasing. A preview excerpt is shown below.
              </p>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="border-l-4 border-teal-500 pl-4 mb-4">
                  <h3 className="font-bold text-navy text-base mb-1">
                    Sample Excerpt — {product.topics[0] ?? product.title}
                  </h3>
                  <p className="text-gray-500 text-xs">
                    {product.pages ? `Preview page 1 of ${product.pages}` : 'Preview excerpt'}
                  </p>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 rounded bg-gray-100" style={{ width: `${90 - i * 10}%` }} />
                  ))}
                  <div className="h-3 rounded bg-gray-100 w-3/4" />
                  <div className="h-3 rounded bg-gray-100 w-5/6" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-gray-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Full content available after purchase
                </div>
              </div>
            </div>

            {/* What you get */}
            <div className="bg-white rounded-2xl border border-gray-100 p-7">
              <h2 className="text-xl font-bold text-navy mb-5">What You Get</h2>
              <ul className="space-y-3">
                {[
                  product.pages ? `${product.pages}-page comprehensive PDF` : 'Comprehensive PDF guide',
                  'Printable & mobile-friendly format',
                  'Ward-ready clinical summaries',
                  'Lifetime access with updates',
                  'Accessible from your dashboard',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-gray-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
