import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import { uploadProductPdf, removeProductPdf } from '@/lib/admin';
import type { AdminProduct } from '@/types';

interface Props {
  products: AdminProduct[];
  onRefresh: () => void;
}

function PdfRow({ product, onRefresh }: { product: AdminProduct; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg(''); setErr('');
    const { error } = await uploadProductPdf(product.id, file);
    setUploading(false);
    if (error) { setErr(error); }
    else { setMsg('PDF uploaded!'); onRefresh(); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = async () => {
    if (!product.file_path) return;
    if (!confirm('Remove this PDF? Users with access will lose the ability to view it.')) return;
    setRemoving(true); setMsg(''); setErr('');
    const { error } = await removeProductPdf(product.id, product.file_path);
    setRemoving(false);
    if (error) { setErr(error); }
    else { setMsg('PDF removed.'); onRefresh(); }
  };

  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-navy text-sm leading-snug">{product.title}</p>
        <p className="text-gray-400 text-xs">₹{product.price}</p>
      </td>
      <td className="px-4 py-3">
        {product.file_path ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PDF Uploaded
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            No PDF
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Upload */}
          <label
            id={`upload-pdf-${product.id}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-all
              ${uploading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'}`}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {product.file_path ? 'Replace PDF' : 'Upload PDF'}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>

          {/* Remove */}
          {product.file_path && (
            <button
              id={`remove-pdf-${product.id}`}
              onClick={handleRemove}
              disabled={removing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
            >
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remove
            </button>
          )}

          {/* Path preview */}
          {product.file_path && (
            <span className="text-gray-400 text-xs font-mono truncate max-w-[160px]" title={product.file_path}>
              {product.file_path.split('/').pop()}
            </span>
          )}
        </div>

        {/* Feedback */}
        {msg && (
          <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />{msg}
          </p>
        )}
        {err && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <X className="w-3 h-3" />{err}
          </p>
        )}
      </td>
    </tr>
  );
}

export function PdfManagementTable({ products, onRefresh }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
        No products found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PDF Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {products.map((p) => (
            <PdfRow key={p.id} product={p} onRefresh={onRefresh} />
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500">
        <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-500" />
        PDFs are stored in a private Supabase Storage bucket. Only approved users can access them via a short-lived signed URL.
      </div>
    </div>
  );
}
