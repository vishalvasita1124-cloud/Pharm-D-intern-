import { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  CloudUpload,
  Download,
  X,
  ExternalLink,
  Lock,
  Globe,
} from 'lucide-react';
import { getResources, createResourceRecord, uploadResourceFile, deleteResource } from '@/lib/admin';
import type { Resource } from '@/types';

interface Props {
  resources: Resource[];
  onRefresh: () => void;
}

// ─── Upload a resource file ───────────────────────────────────────────────────

function ResourceRow({ resource, onRefresh }: { resource: Resource; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    setUploading(true); setMsg(''); setErr(''); setProgress(10);
    const tick = setInterval(() => setProgress((p) => p < 85 ? p + 10 : p), 300);
    const { error } = await uploadResourceFile(resource.id, file);
    clearInterval(tick); setProgress(100);
    setTimeout(() => {
      setUploading(false); setProgress(0);
      if (error) setErr(error);
      else { setMsg('✓ File uploaded!'); setTimeout(() => setMsg(''), 4000); onRefresh(); }
    }, 400);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const doDelete = async () => {
    setDeleting(true);
    const { error } = await deleteResource(resource.id, resource.file_url || undefined);
    setDeleting(false); setConfirmDelete(false);
    if (error) setErr(error);
    else onRefresh();
  };

  const hasFile = !!resource.file_url;

  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${resource.is_free ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              {resource.is_free ? <Globe className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{resource.title}</p>
              {resource.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{resource.description}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${resource.is_free ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                  {resource.is_free ? 'Free' : 'Paid'}
                </span>
                {hasFile && (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Download className="w-2.5 h-2.5" /> File ready
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasFile && (
              <a href={resource.file_url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 font-medium">Delete?</span>
                <button onClick={doDelete} disabled={deleting}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100">No</button>
              </div>
            )}
          </div>
        </div>

        {/* Upload zone */}
        <div className="mt-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group py-3 px-4
              ${dragging ? 'border-teal-400 bg-teal-50 scale-[1.01]' : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/30'}`}
          >
            <input ref={fileRef} type="file" className="hidden" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ''; }} />
            {uploading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-teal-700">Uploading…</p>
                  <div className="w-full mt-1 bg-teal-100 rounded-full h-1 overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CloudUpload className={`w-5 h-5 transition-all ${dragging ? 'text-teal-600 scale-110' : 'text-gray-400 group-hover:text-teal-500'}`} />
                <div>
                  <p className="text-xs font-semibold text-gray-600">{hasFile ? 'Drop to replace file' : 'Drop file here'}</p>
                  <p className="text-xs text-gray-400">or click to browse · max 50 MB</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {msg && <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><p className="text-emerald-700 text-xs font-medium">{msg}</p></div>}
        {err && <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-red-600 text-xs font-medium">{err}</p></div>}
      </div>
    </div>
  );
}

// ─── Create Resource Form ─────────────────────────────────────────────────────

function CreateResourceForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setErr('Title is required.');
    setSaving(true); setErr('');
    const { error } = await createResourceRecord(title, description, isFree);
    setSaving(false);
    if (error) setErr(error);
    else onCreated();
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Title *</label>
        <input id="resource-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Drug Dosing Reference Chart" required />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
        <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the resource" />
      </div>
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <button type="button" onClick={() => setIsFree(!isFree)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isFree ? 'bg-emerald-500' : 'bg-gray-300'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isFree ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-700">{isFree ? 'Free Resource' : 'Paid Resource'}</p>
          <p className="text-xs text-gray-400">{isFree ? 'Anyone can download this' : 'Only paying users can download'}</p>
        </div>
      </div>
      {err && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Creating…' : 'Create Resource'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ResourceManagementPanel({ resources, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);

  const freeCount = resources.filter((r) => r.is_free).length;
  const withFile = resources.filter((r) => r.file_url).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
          <span><span className="font-bold text-gray-800">{resources.length}</span> resources</span>
          <span>·</span>
          <span><span className="font-bold text-emerald-600">{freeCount}</span> free</span>
          <span>·</span>
          <span><span className="font-bold text-blue-600">{withFile}</span> have files</span>
        </div>
        <button
          id="create-resource-toggle"
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
            ${showForm ? 'bg-gray-100 text-gray-700' : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'}`}
        >
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Resource</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-teal-50 rounded-2xl border border-teal-100 p-5">
          <p className="text-sm font-bold text-teal-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Resource
          </p>
          <CreateResourceForm
            onCreated={() => { setShowForm(false); onRefresh(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {resources.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-sm">No resources yet.</p>
          <p className="text-xs mt-1">Add study materials, reference charts, drug lists, etc.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => <ResourceRow key={r.id} resource={r} onRefresh={onRefresh} />)}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Resource files are stored in a public Supabase Storage bucket and can be freely linked.
      </p>
    </div>
  );
}
