import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  FileText,
  Lock,
} from 'lucide-react';
import { getPdfAccess } from '@/lib/pdf';
import { Spinner } from '@/components/ui/Spinner';

// Auto-refresh signed URL 2 minutes before 15-min expiry (at 13 min mark)
const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

export default function PdfViewerPage() {
  const { productId } = useParams<{ productId: string }>();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUrl = useCallback(async (isRefresh = false) => {
    if (!productId) return;
    if (isRefresh) setRefreshing(true);

    const result = await getPdfAccess(productId);

    if (!result.ok) {
      setError(result.message);
      setSignedUrl(null);
    } else {
      setSignedUrl(result.signedUrl ?? null);
      setProductTitle(result.productTitle ?? '');
      setError(null);
    }

    setLoading(false);
    setRefreshing(false);

    // Schedule next auto-refresh
    if (timerRef.current) clearTimeout(timerRef.current);
    if (result.ok) {
      timerRef.current = setTimeout(() => fetchUrl(true), REFRESH_INTERVAL_MS);
    }
  }, [productId]);

  useEffect(() => {
    fetchUrl();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchUrl]);

  const handleDownload = async () => {
    if (!productId) return;
    const result = await getPdfAccess(productId);
    if (!result.ok || !result.signedUrl) return;
    const a = document.createElement('a');
    a.href = result.signedUrl;
    a.download = `${productTitle || 'note'}.pdf`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-400 text-sm mt-4">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col gap-3">
            <Link
              to="/my-notes"
              className="flex items-center justify-center gap-2 bg-medical-700 hover:bg-medical-800 text-white rounded-xl py-2.5 px-5 text-sm font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Notes
            </Link>
            <Link
              to="/dashboard/orders"
              className="flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl py-2.5 px-5 text-sm font-semibold transition-all"
            >
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/my-notes"
            id="pdf-back-btn"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            My Notes
          </Link>
          <span className="text-gray-700">·</span>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            <span className="text-white text-sm font-semibold truncate max-w-xs">{productTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            id="pdf-refresh-btn"
            onClick={() => fetchUrl(true)}
            disabled={refreshing}
            title="Refresh access link"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Download */}
          <button
            id="pdf-download-btn"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* PDF iframe */}
      {signedUrl ? (
        <iframe
          src={signedUrl}
          title={productTitle}
          className="flex-1 w-full border-0"
          style={{ background: '#1a1a1a' }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-sm">Unable to load PDF.</p>
            <button
              onClick={() => fetchUrl()}
              className="mt-4 flex items-center gap-2 mx-auto text-sm text-teal-400 hover:text-teal-300"
            >
              <Loader2 className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Auto-refresh notice */}
      <div className="shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-2 text-xs text-gray-600 flex items-center gap-2">
        <Lock className="w-3 h-3 text-teal-700" />
        Access link auto-refreshes every 13 minutes. This PDF is secured — do not share the URL.
      </div>
    </div>
  );
}
