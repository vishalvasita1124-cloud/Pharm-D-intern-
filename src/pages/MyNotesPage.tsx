import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Eye,
  Download,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccessList, getUserOrders } from '@/lib/orders';
import { getProductById } from '@/lib/notes';
import { getPdfAccess } from '@/lib/pdf';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Product } from '@/types';

interface NoteItem {
  productId: string;
  title: string;
  grantedAt: string;
  orderNumber?: string;
  product: Product | null;
}

function NoteCard({ item }: { item: NoteItem }) {
  const [downloading, setDownloading] = useState(false);
  const [dlErr, setDlErr] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setDlErr('');
    const result = await getPdfAccess(item.productId);
    setDownloading(false);
    if (!result.ok) {
      setDlErr(result.message);
      return;
    }
    const targetUrl = result.blobUrl || result.signedUrl;
    if (targetUrl) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = `${item.title || 'notes'}.pdf`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 hover:border-teal-200 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-medical-800 to-teal-700 flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-7 h-7 text-white/90" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-navy text-base leading-snug mb-1">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-emerald-600 font-semibold">Access Unlocked</span>
              <span className="text-gray-300">·</span>
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {new Date(item.grantedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            {dlErr && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {dlErr}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 w-full sm:w-auto">
          <Link
            to={`/my-notes/${item.productId}/view`}
            id={`view-note-${item.productId}`}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            Open &amp; Read PDF
          </Link>
          <button
            id={`download-note-${item.productId}`}
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 text-xs font-semibold transition-all disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyNotesPage() {
  const { user, syncPurchases } = useAuth();
  const [items, setItems] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Sync purchases first
    await syncPurchases();

    const [accRes, ordRes] = await Promise.all([
      getUserAccessList(),
      getUserOrders(),
    ]);

    // Build unified map of products the user owns
    const map = new Map<string, { productId: string; grantedAt: string; titleFallback?: string }>();

    // From user_access
    accRes.data.forEach((acc) => {
      map.set(acc.product_id, {
        productId: acc.product_id,
        grantedAt: acc.granted_at,
      });
    });

    // From approved orders
    ordRes.data.forEach((ord) => {
      if (ord.status === 'approved') {
        const existing = map.get(ord.product_id);
        map.set(ord.product_id, {
          productId: ord.product_id,
          grantedAt: existing?.grantedAt || ord.updated_at || ord.created_at,
          titleFallback: ord.product_title,
        });
      }
    });

    // Fetch product details
    const list: NoteItem[] = await Promise.all(
      Array.from(map.values()).map(async (entry) => {
        const { data: prod } = await getProductById(entry.productId);
        return {
          productId: entry.productId,
          title: prod?.title || entry.titleFallback || 'Clinical Note',
          grantedAt: entry.grantedAt,
          product: prod,
        };
      })
    );

    setItems(list);
    setLoading(false);
  }, [user, syncPurchases]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-10">
        <div className="container-custom">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">My Notes</h1>
              <p className="text-white/60 text-sm mt-0.5">Your purchased clinical study materials</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package className="w-10 h-10 text-gray-300" />}
            title="No purchased notes yet"
            description="Once you purchase notes and payment is verified, your materials will appear here ready to read."
            action={
              <Link to="/notes" className="btn-primary">
                <BookOpen className="w-4 h-4" />
                Browse Notes
              </Link>
            }
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>{items.length} {items.length === 1 ? 'Course Note' : 'Course Notes'} Available</span>
              <span className="flex items-center gap-1 text-teal-700 font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Instant PDF Access
              </span>
            </div>
            {items.map((item) => (
              <NoteCard key={item.productId} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
