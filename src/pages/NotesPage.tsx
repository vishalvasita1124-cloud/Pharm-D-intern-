import { useState, useMemo, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { getPublishedProducts, getCategories } from '@/lib/notes';
import { clsx } from 'clsx';
import type { ProductFilters, SortOption, Product, Category } from '@/types';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function NotesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    sort: 'newest',
    maxPrice: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([getPublishedProducts(), getCategories()]).then(([prodRes, catRes]) => {
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setLoading(false);
    });
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category?.name.toLowerCase().includes(q) ||
          p.topics.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category
    if (filters.category) {
      result = result.filter((p) => p.category_id === filters.category);
    }

    // Price
    if (filters.maxPrice !== null) {
      result = result.filter((p) => p.price <= filters.maxPrice!);
    }

    // Sort
    switch (filters.sort) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'oldest':
        result.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case 'newest':
      default:
        result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    return result;
  }, [filters, products]);

  const clearFilters = () => {
    setFilters({ search: '', category: '', sort: 'newest', maxPrice: null });
  };

  const hasActiveFilters = filters.search || filters.category || filters.maxPrice !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-14">
        <div className="container-custom text-center">
          <p className="text-teal-400 font-semibold text-sm uppercase tracking-wider mb-3">All Notes</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">
            Clinical Notes Marketplace
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Browse all available ward-ready notes for Pharm D interns and clinical pharmacy learners.
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="notes-search-input"
              type="text"
              placeholder='Search "ECG", "Cardiology", "ABG"...'
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="input-base pl-12"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            id="notes-sort-select"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortOption }))}
            className="input-base sm:w-52"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            id="notes-filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-colors',
              showFilters
                ? 'bg-medical-700 border-medical-700 text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:border-medical-400'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-teal-400" />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Category filter */}
              <div className="flex-1">
                <label className="text-sm font-semibold text-navy mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    id="filter-category-all"
                    onClick={() => setFilters((f) => ({ ...f, category: '' }))}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      !filters.category
                        ? 'bg-medical-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      id={`filter-category-${cat.slug}`}
                      onClick={() => setFilters((f) => ({ ...f, category: cat.id }))}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        filters.category === cat.id
                          ? 'bg-medical-700 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price filter */}
              <div className="sm:w-48">
                <label className="text-sm font-semibold text-navy mb-2 block">Max Price</label>
                <div className="flex flex-wrap gap-2">
                  {[null, 79, 99, 129].map((price) => (
                    <button
                      key={String(price)}
                      id={`filter-price-${price ?? 'all'}`}
                      onClick={() => setFilters((f) => ({ ...f, maxPrice: price }))}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        filters.maxPrice === price
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {price === null ? 'Any' : `≤₹${price}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                id="filter-clear-btn"
                onClick={clearFilters}
                className="mt-4 text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="text-gray-400 text-sm">Loading notes…</p>
          </div>
        ) : (
          <>
            {/* Result count */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-gray-500 text-sm">
                <span className="font-semibold text-navy">{filteredProducts.length}</span>{' '}
                {filteredProducts.length === 1 ? 'note' : 'notes'} found
                {filters.search && (
                  <span className="text-gray-400"> for "{filters.search}"</span>
                )}
              </p>
            </div>

            {/* Product grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No notes found"
                description={`We couldn't find any notes matching "${filters.search}". Try a different search term or clear your filters.`}
                action={
                  <button onClick={clearFilters} id="empty-state-clear-btn" className="btn-primary">
                    Clear filters
                  </button>
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
