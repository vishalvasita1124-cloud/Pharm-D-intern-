import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ShoppingCart,
  Download,
  Star,
  Users,
  Stethoscope,
  Activity,
  FlaskConical,
  Microscope,
  ChevronRight,
} from 'lucide-react';
import { ProductCard } from '@/components/products/ProductCard';
import { CategoryCard } from '@/components/products/CategoryCard';
import { Spinner } from '@/components/ui/Spinner';
import { getPublishedProducts, getCategories } from '@/lib/notes';
import type { Product, Category } from '@/types';

const STATS = [
  { value: '8+', label: 'Clinical Notes' },
  { value: '4', label: 'Speciality Areas' },
  { value: '350+', label: 'Topics Covered' },
  { value: '100%', label: 'Ward-Ready' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Browse & Select',
    desc: 'Explore our curated clinical notes across diagnostic, therapeutic and research categories.',
  },
  {
    step: '02',
    icon: <ShoppingCart className="w-6 h-6" />,
    title: 'Purchase Securely',
    desc: 'Complete your purchase via secure UPI payment. Verification is quick and transparent.',
  },
  {
    step: '03',
    icon: <Download className="w-6 h-6" />,
    title: 'Instant PDF Access',
    desc: 'Once payment is confirmed, download your notes instantly from your dashboard.',
  },
];

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

const TESTIMONIALS = [
  {
    name: 'Dr. Priya Nair',
    role: 'Pharm D Intern, Apollo Hospital',
    text: 'The ECG notes helped me confidently interpret rhythms during ward rounds. Concise, accurate and ward-ready!',
    stars: 5,
  },
  {
    name: 'Rahul Sharma',
    role: 'Pharm D Student, MAHE',
    text: 'ABG interpretation became so much clearer after these notes. Highly recommend for any Pharm D learner.',
    stars: 5,
  },
  {
    name: 'Dr. Kavya Reddy',
    role: 'Clinical Pharmacist, AIIMS',
    text: 'The ward round notes are exactly what every clinical pharmacy intern needs. Practical and comprehensive.',
    stars: 5,
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    Promise.all([getPublishedProducts(), getCategories()]).then(([prodRes, catRes]) => {
      setFeaturedProducts(prodRes.data);
      setCategories(catRes.data);
      setLoadingProducts(false);
    });
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-medical-950 via-medical-900 to-teal-900 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-medical-500/10 blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="container-custom relative z-10 py-24">
          <div className="max-w-3xl">
            {/* Tagline chip */}
            <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-500/30 rounded-full px-4 py-2 mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-teal-300 text-sm font-medium">Your Clinical Pharmacy Companion</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 animate-slide-up text-balance">
              Pharm&nbsp;D{' '}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
                Intern Notes
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed mb-10 max-w-2xl animate-slide-up">
              Practical, concise and ward-ready notes designed for{' '}
              <span className="text-white font-semibold">Pharm D students</span> and clinical pharmacy interns.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
              <Link to="/notes" id="hero-explore-btn" className="btn-teal text-base px-8 py-4">
                <BookOpen className="w-5 h-5" />
                Explore Notes
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#how-it-works" id="hero-howitworks-btn" className="btn-secondary border-white/30 text-white hover:bg-white hover:text-medical-900 text-base px-8 py-4">
                How It Works
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 border-t border-white/10 pt-10">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-extrabold text-white">{stat.value}</div>
                  <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Notes ───────────────────────────────────────── */}
      <section className="section-pad bg-gray-50">
        <div className="container-custom">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-teal-600 font-semibold text-sm uppercase tracking-wider mb-2">Clinical Notes</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-navy">Featured Notes</h2>
              <p className="text-gray-500 mt-2 max-w-xl">
                Curated, ward-tested notes covering essential clinical pharmacy competencies.
              </p>
            </div>
            <Link
              to="/notes"
              id="featured-view-all-btn"
              className="hidden sm:flex items-center gap-1.5 text-medical-700 font-semibold hover:gap-2.5 transition-all"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Link to="/notes" id="featured-mobile-view-all" className="btn-secondary">
              View all notes
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────── */}
      <section className="section-pad">
        <div className="container-custom">
          <div className="text-center mb-12">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-wider mb-2">Explore by Subject</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy mb-3">Browse Categories</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Find notes organised by clinical specialty. From diagnostic interpretation to research and regulatory frameworks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="section-pad bg-gradient-to-br from-medical-950 to-teal-900">
        <div className="container-custom">
          <div className="text-center mb-14">
            <p className="text-teal-400 font-semibold text-sm uppercase tracking-wider mb-2">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">How It Works</h2>
            <p className="text-gray-300 max-w-xl mx-auto">
              Getting your clinical notes is straightforward, secure and fast.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.step} className="relative">
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-teal-600/50 to-transparent -translate-x-8 z-0" />
                )}
                <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-7 hover:bg-white/15 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                      {step.icon}
                    </div>
                    <span className="text-4xl font-extrabold text-white/20">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section className="section-pad bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-wider mb-2">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy mb-3">What Learners Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-navy text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section className="section-pad bg-gradient-to-r from-medical-700 to-teal-700">
        <div className="container-custom text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
            <Users className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">Join 100+ Pharm D learners</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 text-balance">
            Ready to Elevate Your Clinical Knowledge?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Get access to premium, ward-tested clinical pharmacy notes designed to make you a more confident practitioner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" id="cta-register-btn" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-medical-800 font-bold hover:bg-gray-50 active:scale-95 transition-all shadow-lg text-base">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/notes" id="cta-browse-btn" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white text-white font-bold hover:bg-white/10 active:scale-95 transition-all text-base">
              Browse Notes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
