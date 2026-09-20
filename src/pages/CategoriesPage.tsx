import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Activity, FlaskConical, Microscope } from 'lucide-react';
import { CategoryCard } from '@/components/products/CategoryCard';
import { ProductCard } from '@/components/products/ProductCard';
import { Spinner } from '@/components/ui/Spinner';
import { getPublishedProducts, getCategories } from '@/lib/notes';
import type { Category, Product } from '@/types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'clinical-pharmacy': <Stethoscope className="w-6 h-6" />,
  'diagnostic-skills': <Activity className="w-6 h-6" />,
  therapeutics: <FlaskConical className="w-6 h-6" />,
  'clinical-research': <Microscope className="w-6 h-6" />,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  'clinical-pharmacy': 'bg-gradient-to-r from-medical-600 to-medical-500',
  'diagnostic-skills': 'bg-gradient-to-r from-teal-600 to-teal-500',
  therapeutics: 'bg-gradient-to-r from-indigo-600 to-medical-600',
  'clinical-research': 'bg-gradient-to-r from-emerald-600 to-teal-600',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCategories(), getPublishedProducts()]).then(([catRes, prodRes]) => {
      setCategories(catRes.data);
      setProducts(prodRes.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-14">
        <div className="container-custom text-center">
          <p className="text-teal-400 font-semibold text-sm uppercase tracking-wider mb-3">Specialities</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">Browse by Category</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Explore clinical notes organised by specialty and subject area.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="container-custom py-12 space-y-16">
          {/* Category overview cards */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  subcategories={[]}
                  icon={CATEGORY_ICONS[cat.slug]}
                  gradient={CATEGORY_GRADIENTS[cat.slug]}
                />
              ))}
            </div>
          </section>

          {/* Per-category sections with notes */}
          {categories.map((cat) => {
            const catProducts = products.filter((p) => p.category_id === cat.id);

            return (
              <section key={cat.id} id={cat.slug} className="scroll-mt-20">
                {/* Section header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-medical-100 flex items-center justify-center text-medical-700">
                        {CATEGORY_ICONS[cat.slug]}
                      </div>
                      <h2 className="text-2xl font-extrabold text-navy">{cat.name}</h2>
                    </div>
                    <p className="text-gray-500 text-sm max-w-xl">{cat.description}</p>
                  </div>
                  {catProducts.length === 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>

                {/* Notes in category */}
                {catProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                    <p className="text-gray-400 text-sm">
                      Notes for <strong>{cat.name}</strong> are currently being prepared. Check back soon!
                    </p>
                    <Link to="/notes" className="inline-block mt-4 text-sm text-medical-600 font-semibold hover:underline">
                      Browse all available notes →
                    </Link>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
