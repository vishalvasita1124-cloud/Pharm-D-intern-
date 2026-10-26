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
  ExternalLink,
  MessageCircle,
  BookOpen,
} from 'lucide-react';
import { getPdfAccess } from '@/lib/pdf';
import { Spinner } from '@/components/ui/Spinner';

// Auto-refresh signed URL 2 minutes before 60-min expiry (at 58 min mark)
const REFRESH_INTERVAL_MS = 58 * 60 * 1000;

export default function PdfViewerPage() {
  const { productId } = useParams<{ productId: string }>();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUrl = useCallback(async (isRefresh = false) => {
    if (!productId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const result = await getPdfAccess(productId);

    if (!result.ok) {
      setError(result.message);
      setPdfUrl(null);
    } else {
      setPdfUrl(result.blobUrl || result.signedUrl || null);
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
    if (!pdfUrl && productId) {
      const result = await getPdfAccess(productId);
      if (result.ok && result.signedUrl) {
        const a = document.createElement('a');
        a.href = result.signedUrl;
        a.download = `${productTitle || 'notes'}.pdf`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
      return;
    }
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${productTitle || 'notes'}.pdf`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }
  };

  const handleOpenExternal = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-300 text-sm mt-4 font-medium">Verifying purchase &amp; loading PDF…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">PDF Access</h1>
          <p className="text-gray-300 text-sm mb-6 leading-relaxed">{error}</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => fetchUrl()}
              className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 px-5 text-sm font-semibold transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              to="/my-notes"
              className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2.5 px-5 text-sm font-semibold transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Go to My Notes
            </Link>
            <a
              href="https://wa.me/919512184197?text=Hi%2C%20I%20have%20purchased%20notes%20but%20need%20help%20opening%20the%20PDF"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border border-emerald-600/40 text-emerald-400 hover:bg-emerald-950/40 rounded-xl py-2.5 px-5 text-sm font-semibold transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Support (+91 9512184197)
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/my-notes"
            id="pdf-back-btn"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs sm:text-sm font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">My Notes</span>
          </Link>
          <span className="text-gray-700 hidden sm:inline">·</span>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-white text-xs sm:text-sm font-semibold truncate max-w-[160px] sm:max-w-md">
              {productTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Open in new tab (essential for mobile & tablets) */}
          <button
            onClick={handleOpenExternal}
            title="Open in new window / full screen"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in Tab</span>
          </button>

          {/* Download */}
          <button
            id="pdf-download-btn"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Refresh */}
          <button
            id="pdf-refresh-btn"
            onClick={() => fetchUrl(true)}
            disabled={refreshing}
            title="Refresh access link"
            className="p-1.5 sm:px-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile helper notice */}
      <div className="bg-teal-950/80 border-b border-teal-800/40 px-4 py-2 flex items-center justify-between text-xs text-teal-200">
        <span className="truncate">Viewing PDF. For zoom &amp; full screen, tap &ldquo;Open in Tab&rdquo;.</span>
        <button
          onClick={handleOpenExternal}
          className="text-teal-300 font-bold underline ml-2 shrink-0 hover:text-white"
        >
          Open in Tab &rarr;
        </button>
      </div>

      {/* PDF View Container */}
      <div className="flex-1 w-full relative bg-[#1a1a1a]">
        {pdfUrl ? (
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-full border-0"
          >
            {/* Fallback iframe */}
            <iframe
              src={pdfUrl}
              title={productTitle}
              className="w-full h-full border-0"
            >
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-300">
                <FileText className="w-12 h-12 text-teal-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">PDF Ready to View</h3>
                <p className="text-sm text-gray-400 max-w-sm mb-5">
                  Your browser does not support embedded PDF previews. Tap below to view your notes in a new window:
                </p>
                <button
                  onClick={handleOpenExternal}
                  className="btn-primary"
                >
                  <ExternalLink className="w-4 h-4" /> Open Full PDF
                </button>
              </div>
            </iframe>
          </object>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-sm">Unable to load PDF preview.</p>
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
      </div>

      {/* Footer security note */}
      <div className="shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-2 text-xs text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-teal-600" />
          <span>Encrypted Clinical Notes &mdash; Pharm D Intern</span>
        </div>
        <button
          onClick={handleOpenExternal}
          className="text-teal-400 hover:underline flex items-center gap-1"
        >
          <span>Full Screen</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
