import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Package,
  Save,
  X,
} from 'lucide-react';
import { createProduct, updateProduct, deleteProduct } from '@/lib/admin';
import { getCategories } from '@/lib/notes';
import type { AdminProduct, ProductInput, Category } from '@/types';

interface Props {
  products: AdminProduct[];
  onRefresh: () => void;
}

const EMPTY_FORM: ProductInput = {
  title: '',
  slug: '',
  description: '',
  short_description: '',
  category_id: '',
  price: 0,
  pages: 0,
  cover_url: '',
  preview_url: '',
  topics: '',
  is_published: false,
};

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product?: AdminProduct;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState<ProductInput>(() =>
    product
      ? {
          title: product.title,
          slug: product.slug,
          description: product.description,
          short_description: product.short_description,
          category_id: product.category_id || '',
          price: product.price,
          pages: product.pages || 0,
          cover_url: product.cover_url || '',
          preview_url: product.preview_url || '',
          topics: (product.topics || []).join(', '),
          is_published: product.is_published,
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof ProductInput, val: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Auto-generate slug from title when creating
  useEffect(() => {
    if (!isEdit && form.title) {
      set('slug', form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [form.title, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required.');
    if (form.price < 0) return setError('Price cannot be negative.');

    setSaving(true);
    setError('');

    let err: string | null = null;
    if (isEdit) {
      const res = await updateProduct(product!.id, form);
      err = res.error;
    } else {
      const res = await createProduct(form);
      err = res.error;
    }

    setSaving(false);
    if (err) { setError(err); }
    else { onSave(); }
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400 transition-all';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelCls}>Title *</label>
          <input id="product-title" className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. ABG Interpretation Notes" required />
        </div>

        <div>
          <label className={labelCls}>Slug (URL)</label>
          <input className={inputCls} value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto-generated from title" />
        </div>

        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">— No category —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Price (₹) *</label>
          <input id="product-price" className={inputCls} type="number" min="0" value={form.price} onChange={(e) => set('price', Number(e.target.value))} required />
        </div>

        <div>
          <label className={labelCls}>Pages</label>
          <input className={inputCls} type="number" min="0" value={form.pages} onChange={(e) => set('pages', Number(e.target.value))} />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>Short Description</label>
          <input className={inputCls} value={form.short_description} onChange={(e) => set('short_description', e.target.value)} placeholder="One-line summary shown in cards" />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>Full Description</label>
          <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detailed description for the product page" />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>Topics (comma-separated)</label>
          <input className={inputCls} value={form.topics} onChange={(e) => set('topics', e.target.value)} placeholder="e.g. ABG, Respiratory, ICU" />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>Cover Image URL</label>
          <input className={inputCls} value={form.cover_url} onChange={(e) => set('cover_url', e.target.value)} placeholder="https://..." />
        </div>

        <div className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <button
            type="button"
            onClick={() => set('is_published', !form.is_published)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
              ${form.is_published ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
              ${form.is_published ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-700">{form.is_published ? 'Published' : 'Draft'}</p>
            <p className="text-xs text-gray-400">{form.is_published ? 'Visible to customers' : 'Hidden from customers'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button id={isEdit ? 'save-product-btn' : 'create-product-btn'} type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-medical-700 hover:bg-medical-800 text-white text-sm font-semibold transition-all disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Product Row in List ──────────────────────────────────────────────────────

function ProductRow({
  product,
  categories,
  onRefresh,
}: {
  product: AdminProduct;
  categories: Category[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await deleteProduct(product.id);
    setDeleting(false);
    if (error) { setDeleteErr(error); }
    else { onRefresh(); }
  };

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-medical-200 p-5">
        <p className="text-sm font-bold text-medical-700 mb-4 flex items-center gap-2">
          <Edit2 className="w-4 h-4" /> Editing: {product.title}
        </p>
        <ProductForm
          product={product}
          categories={categories}
          onSave={() => { setEditing(false); onRefresh(); }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${product.is_published ? 'bg-emerald-50' : 'bg-gray-50'}`}>
            <Package className={`w-4.5 h-4.5 ${product.is_published ? 'text-emerald-600' : 'text-gray-400'}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm truncate">{product.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">₹{product.price} · /{product.slug}</p>
            {product.short_description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.short_description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {product.is_published ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
              <EyeOff className="w-3 h-3" /> Draft
            </span>
          )}

          <button id={`edit-product-${product.id}`} onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-medical-600 hover:bg-medical-50 transition-all">
            <Edit2 className="w-4 h-4" />
          </button>

          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-600 font-medium">Delete?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100">No</button>
            </div>
          )}
        </div>
      </div>
      {deleteErr && <p className="text-xs text-red-500 mt-2">{deleteErr}</p>}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ProductManagementPanel({ products, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    getCategories().then(({ data }) => { setCategories(data); setCatLoading(false); });
  }, []);

  const published = products.filter((p) => p.is_published).length;

  return (
    <div className="space-y-5">
      {/* Stats + Create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{published}</span> published ·{' '}
          <span className="font-bold text-gray-800">{products.length - published}</span> drafts ·{' '}
          <span className="font-bold text-gray-800">{products.length}</span> total
        </p>
        <button
          id="create-product-toggle"
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
            ${showForm ? 'bg-gray-100 text-gray-700' : 'bg-medical-700 hover:bg-medical-800 text-white shadow-sm'}`}
        >
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Product</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-medical-50 rounded-2xl border border-medical-100 p-5">
          <p className="text-sm font-bold text-medical-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Product
          </p>
          {catLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : (
            <ProductForm
              categories={categories}
              onSave={() => { setShowForm(false); onRefresh(); }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>
      )}

      {/* Product list */}
      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-sm">No products yet.</p>
          <p className="text-xs mt-1">Click "Add Product" to create your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {catLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : (
            products.map((p) => (
              <ProductRow key={p.id} product={p} categories={categories} onRefresh={onRefresh} />
            ))
          )}
        </div>
      )}

      {products.length > 0 && (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <p className="text-xs text-gray-400">
            Products with <span className="text-emerald-600 font-medium">Published</span> status are visible to customers.
          </p>
        </div>
      )}
    </div>
  );
}
