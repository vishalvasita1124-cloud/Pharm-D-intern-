import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccessList } from '@/lib/orders';
import { getProductById } from '@/lib/notes';
import { getPdfAccess } from '@/lib/pdf';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { UserAccess, Product } from '@/types';

interface AccessWithProduct extends UserAccess {
  product: Product | null;
}

function NoteCard({ item }: { item: AccessWithProduct }) {
  const [downloading, setDownloading] = useState(false);
  const [dlErr, setDlErr] = useState('');

  const hasPdf = !!item.product?.file_path;

  const handleDownload = async () => {
    if (!item.product) return;
    setDownloading(true); setDlErr('');
    const result = await getPdfAccess(item.product_id);
    setDownloading(false);
    if (!result.ok) { setDlErr(result.message); return; }
    // Trigger browser download
    const a = document.createElement('a');
    a.href = result.signedUrl!;
    a.download = `${item.product.title}.pdf`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-medical-800 to-teal-700 flex items-center justify-center shrink-0">
          <BookOpen className="w-7 h-7 text-white/80" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-navy leading-snug mb-1">
            {item.product?.title ?? 'Loading…'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600 font-semibold">Access Granted</span>
            <span className="text-gray-300">·</span>
            <Clock className="w-3 h-3" />
            {new Date(item.granted_at).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </div>

          {!hasPdf ? (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              PDF not yet uploaded — check back soon
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Link
                to={`/my-notes/${item.product_id}/view`}
                id={`view-note-${item.product_id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-medical-700 hover:bg-medical-800 text-white text-xs font-semibold transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                View PDF
              </Link>
              <button
                id={`download-note-${item.product_id}`}
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-semibold transition-all disabled:opacity-60"
              >
                {downloading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />
                }
                Download
              </button>
            </div>
          )}

          {dlErr && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{dlErr}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyNotesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AccessWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserAccessList().then(async ({ data: accessList }) => {
      // Fetch product details for each access record in parallel
      const withProducts = await Promise.all(
        accessList.map(async (acc) => {
          const { data: product } = await getProductById(acc.product_id);
          return { ...acc, product };
        }),
      );
      setItems(withProducts);
      setLoading(false);
    });
  }, [user]);

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
              <p className="text-white/60 text-sm mt-0.5">Your purchased clinical notes</p>
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
            description="Browse our notes marketplace and make your first purchase."
            action={
              <Link to="/notes" className="btn-primary">
                <BookOpen className="w-4 h-4" />
                Browse Notes
              </Link>
            }
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {items.map((item) => (
              <NoteCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
