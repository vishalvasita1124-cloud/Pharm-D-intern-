import { useState, useRef, useCallback } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudUpload,
  Eye,
  EyeOff,
} from 'lucide-react';
import { uploadProductPdf, removeProductPdf, uploadPreviewPdf, removePreviewPdf } from '@/lib/admin';
import type { AdminProduct } from '@/types';

interface Props {
  products: AdminProduct[];
  onRefresh: () => void;
}

// ─── Reusable Upload Zone ─────────────────────────────────────────────────────

function UploadZone({
  onFile,
  uploading,
  progress,
  hasPdf,
  label,
  accept = '.pdf,application/pdf',
}: {
  onFile: (f: File) => void;
  uploading: boolean;
  progress: number;
  hasPdf: boolean;
  label: string;
  accept?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && fileRef.current?.click()}
      className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group
        ${dragging ? 'border-teal-400 bg-teal-50 scale-[1.01]' : hasPdf ? 'border-gray-200 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/40' : 'border-teal-300 bg-teal-50/50 hover:border-teal-400 hover:bg-teal-50'}`}
    >
      <input ref={fileRef} type="file" accept={accept} className="hidden" disabled={uploading}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      <div className="flex flex-col items-center justify-center py-4 px-3 text-center">
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin mb-2" />
            <p className="text-teal-700 text-xs font-semibold">Uploading…</p>
            <div className="w-full mt-2 bg-teal-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-all
              ${dragging ? 'bg-teal-200 scale-110' : 'bg-white shadow-sm group-hover:shadow-md group-hover:scale-105'}`}>
              <CloudUpload className={`w-5 h-5 ${dragging ? 'text-teal-600' : 'text-teal-500'}`} />
            </div>
            <p className="text-xs font-semibold text-gray-700">{hasPdf ? `Drop to replace ${label}` : `Drop ${label} here`}</p>
            <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Product PDF Card ─────────────────────────────────────────────────────────

function PdfCard({ product, onRefresh }: { product: AdminProduct; onRefresh: () => void }) {
  // Paid PDF state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Preview PDF state
  const [previewUploading, setPreviewUploading] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewRemoving, setPreviewRemoving] = useState(false);
  const [confirmPreviewRemove, setConfirmPreviewRemove] = useState(false);
  const [previewMsg, setPreviewMsg] = useState('');
  const [previewErr, setPreviewErr] = useState('');

  const runWithProgress = useCallback((
    setter: React.Dispatch<React.SetStateAction<number>>,
    setterLoading: React.Dispatch<React.SetStateAction<boolean>>,
    fn: () => Promise<{ error: string | null } | { url?: string | null; filePath?: string | null; error: string | null }>,
    onSuccess: string,
    setFeedback: React.Dispatch<React.SetStateAction<string>>,
    setError: React.Dispatch<React.SetStateAction<string>>,
  ) => async (file?: File) => {
    setterLoading(true); setFeedback(''); setError(''); setter(10);
    const tick = setInterval(() => setter((p) => p < 85 ? p + 10 : p), 300);
    const res = await fn();
    clearInterval(tick); setter(100);
    setTimeout(() => {
      setterLoading(false); setter(0);
      if (res.error) { setError(res.error); }
      else { setFeedback(onSuccess); setTimeout(() => setFeedback(''), 4000); onRefresh(); }
    }, 400);
    // suppress TS warning
    void file;
  }, [onRefresh]);

  const doUploadPaid = useCallback(async (file: File) => {
    setUploading(true); setMsg(''); setErr(''); setProgress(10);
    const tick = setInterval(() => setProgress((p) => p < 85 ? p + 10 : p), 300);
    const { error } = await uploadProductPdf(product.id, file);
    clearInterval(tick); setProgress(100);
    setTimeout(() => { setUploading(false); setProgress(0); if (error) setErr(error); else { setMsg('✓ PDF uploaded!'); setTimeout(() => setMsg(''), 4000); onRefresh(); } }, 400);
  }, [product.id, onRefresh]);

  const doRemovePaid = async () => {
    if (!product.file_path) return;
    setRemoving(true); setMsg(''); setErr('');
    const { error } = await removeProductPdf(product.id, product.file_path);
    setRemoving(false); setConfirmRemove(false);
    if (error) setErr(error); else { setMsg('PDF removed.'); setTimeout(() => setMsg(''), 3000); onRefresh(); }
  };

  const doUploadPreview = useCallback(async (file: File) => {
    setPreviewUploading(true); setPreviewMsg(''); setPreviewErr(''); setPreviewProgress(10);
    const tick = setInterval(() => setPreviewProgress((p) => p < 85 ? p + 10 : p), 300);
    const { error } = await uploadPreviewPdf(product.id, file);
    clearInterval(tick); setPreviewProgress(100);
    setTimeout(() => { setPreviewUploading(false); setPreviewProgress(0); if (error) setPreviewErr(error); else { setPreviewMsg('✓ Preview uploaded!'); setTimeout(() => setPreviewMsg(''), 4000); onRefresh(); } }, 400);
  }, [product.id, onRefresh]);

  const doRemovePreview = async () => {
    if (!product.preview_url) return;
    setPreviewRemoving(true); setPreviewMsg(''); setPreviewErr('');
    const { error } = await removePreviewPdf(product.id, product.preview_url);
    setPreviewRemoving(false); setConfirmPreviewRemove(false);
    if (error) setPreviewErr(error); else { setPreviewMsg('Preview removed.'); setTimeout(() => setPreviewMsg(''), 3000); onRefresh(); }
  };

  // suppress unused warning
  void runWithProgress;

  const hasPdf = !!product.file_path;
  const hasPreview = !!product.preview_url;
  const paidFilename = product.file_path?.split('/').pop() ?? '';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasPdf ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <FileText className={`w-5 h-5 ${hasPdf ? 'text-emerald-600' : 'text-amber-500'}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm leading-snug truncate">{product.title}</p>
            <p className="text-gray-400 text-xs mt-0.5">₹{product.price} · {product.pages || 0} pages</p>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {hasPreview && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3" /> Preview
            </span>
          )}
          {hasPdf ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> PDF Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" /> No PDF
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 pt-4 space-y-5">
        {/* ── Paid PDF Section ── */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Full PDF (Paid — Private)
          </p>
          <UploadZone onFile={doUploadPaid} uploading={uploading} progress={progress} hasPdf={hasPdf} label="full PDF" />

          {hasPdf && !uploading && (
            <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500 font-mono truncate" title={paidFilename}>{paidFilename}</span>
              </div>
              {!confirmRemove ? (
                <button id={`remove-pdf-${product.id}`} onClick={(e) => { e.stopPropagation(); setConfirmRemove(true); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-red-600 font-medium">Sure?</span>
                  <button onClick={(e) => { e.stopPropagation(); doRemovePaid(); }} disabled={removing}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50">
                    {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-all">Cancel</button>
                </div>
              )}
            </div>
          )}
          {!uploading && (
            <label id={`upload-pdf-btn-${product.id}`}
              className="mt-2 flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 hover:border-teal-300 transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {hasPdf ? 'Replace Full PDF' : 'Upload Full PDF'}
              <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doUploadPaid(f); e.target.value = ''; }} />
            </label>
          )}
          {msg && <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><p className="text-emerald-700 text-xs font-medium">{msg}</p></div>}
          {err && <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-red-600 text-xs font-medium">{err}</p></div>}
        </div>

        {/* ── Preview PDF Section ── */}
        <div className="border-t border-gray-50 pt-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Preview PDF (Free — Public)
          </p>
          <UploadZone onFile={doUploadPreview} uploading={previewUploading} progress={previewProgress} hasPdf={hasPreview} label="preview PDF" />

          {hasPreview && !previewUploading && (
            <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 min-w-0">
                <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a href={product.preview_url!} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 font-mono truncate hover:underline">View preview</a>
              </div>
              {!confirmPreviewRemove ? (
                <button onClick={(e) => { e.stopPropagation(); setConfirmPreviewRemove(true); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition-all shrink-0">
                  <EyeOff className="w-3.5 h-3.5" /> Remove
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-red-600 font-medium">Sure?</span>
                  <button onClick={(e) => { e.stopPropagation(); doRemovePreview(); }} disabled={previewRemoving}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50">
                    {previewRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmPreviewRemove(false); }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-all">Cancel</button>
                </div>
              )}
            </div>
          )}
          {!previewUploading && (
            <label className="mt-2 flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {hasPreview ? 'Replace Preview PDF' : 'Upload Preview PDF'}
              <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doUploadPreview(f); e.target.value = ''; }} />
            </label>
          )}
          {previewMsg && <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><p className="text-emerald-700 text-xs font-medium">{previewMsg}</p></div>}
          {previewErr && <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-red-600 text-xs font-medium">{previewErr}</p></div>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function PdfManagementTable({ products, onRefresh }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="font-medium text-sm">No products found.</p>
        <p className="text-xs mt-1">Add products first to manage their PDFs.</p>
      </div>
    );
  }

  const withPdf = products.filter((p) => p.file_path).length;
  const withPreview = products.filter((p) => p.preview_url).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 px-1 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-500"><span className="font-bold text-gray-800">{withPdf}</span>/{products.length} have full PDF</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-gray-500"><span className="font-bold text-gray-800">{withPreview}</span>/{products.length} have preview</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {products.map((p) => <PdfCard key={p.id} product={p} onRefresh={onRefresh} />)}
      </div>

      <p className="text-xs text-gray-400 text-center pt-1">
        Full PDFs → private bucket (paid users only) · Preview PDFs → public bucket (free teaser)
      </p>
    </div>
  );
}
