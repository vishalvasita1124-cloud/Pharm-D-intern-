import { Link } from 'react-router-dom';
import { FileText, ArrowRight, BookOpen, Stethoscope, FlaskConical, Microscope } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  className?: string;
}

// Gradient placeholders when no cover image
const COVER_GRADIENTS: Record<string, { from: string; to: string; icon: React.ReactNode }> = {
  'prod-7': {
    from: 'from-medical-800',
    to: 'to-teal-700',
    icon: <Stethoscope className="w-16 h-16 text-white/80" />,
  },
  'prod-8': {
    from: 'from-indigo-800',
    to: 'to-medical-700',
    icon: <FlaskConical className="w-16 h-16 text-white/80" />,
  },
};

function CoverPlaceholder({ productId, title }: { productId: string; title: string }) {
  const cfg = COVER_GRADIENTS[productId] ?? {
    from: 'from-medical-800',
    to: 'to-medical-900',
    icon: <BookOpen className="w-16 h-16 text-white/80" />,
  };
  return (
    <div
      className={clsx(
        'w-full h-full flex flex-col items-center justify-center bg-gradient-to-br',
        cfg.from,
        cfg.to
      )}
    >
      <div className="mb-4 opacity-80">{cfg.icon}</div>
      <p className="text-white/70 text-xs text-center px-4 font-medium">{title}</p>
    </div>
  );
}

function formatCategory(cat: string) {
  return cat;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const categoryName = product.category?.name ?? product.category_id;

  return (
    <div
      className={clsx(
        'group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm card-hover',
        className
      )}
    >
      {/* Cover */}
      <div className="relative h-52 overflow-hidden bg-medical-900">
        {product.cover_url ? (
          <img
            src={product.cover_url}
            alt={`Cover for ${product.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <CoverPlaceholder productId={product.id} title={product.title} />
        )}
        {/* Price tag */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-md">
          <span className="text-medical-800 font-bold text-sm">₹{product.price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category badge */}
        <Badge variant="teal" className="mb-2.5">
          {categoryName}
        </Badge>

        {/* Title */}
        <h3 className="font-bold text-navy text-base leading-snug mb-2 line-clamp-2 group-hover:text-medical-700 transition-colors">
          {product.title}
        </h3>

        {/* Short desc */}
        <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
          {product.short_description}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <FileText className="w-3.5 h-3.5" />
            <span>{product.pages} pages</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <Microscope className="w-3.5 h-3.5" />
            <span>{product.topics.length} topics</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          to={`/notes/${product.slug}`}
          id={`product-card-${product.slug}`}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-medical-50 text-medical-700 font-semibold text-sm hover:bg-medical-700 hover:text-white transition-all duration-200 group/btn"
        >
          <span>View Details</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
