import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  subcategories?: string[];
  icon?: React.ReactNode;
  gradient?: string;
  className?: string;
}

export function CategoryCard({ category, subcategories = [], icon, gradient, className }: CategoryCardProps) {
  return (
    <Link
      to={`/categories#${category.slug}`}
      id={`category-card-${category.slug}`}
      className={clsx(
        'group relative overflow-hidden rounded-2xl p-6 border border-gray-100 bg-white shadow-sm card-hover block',
        className
      )}
    >
      {/* Gradient accent top */}
      <div
        className={clsx(
          'absolute top-0 left-0 right-0 h-1 rounded-t-2xl',
          gradient ?? 'bg-gradient-to-r from-medical-600 to-teal-500'
        )}
      />

      {/* Icon */}
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-medical-50 group-hover:bg-medical-100 flex items-center justify-center mb-4 transition-colors text-medical-700">
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className="font-bold text-navy text-lg mb-1.5 group-hover:text-medical-700 transition-colors">
        {category.name}
      </h3>

      {/* Description */}
      {category.description && (
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">
          {category.description}
        </p>
      )}

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {subcategories.slice(0, 4).map((sub) => (
            <span
              key={sub}
              className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-lg font-medium"
            >
              {sub}
            </span>
          ))}
          {subcategories.length > 4 && (
            <span className="px-2.5 py-1 bg-gray-50 text-gray-400 text-xs rounded-lg font-medium">
              +{subcategories.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Arrow */}
      <div className="flex items-center gap-1 text-medical-600 text-sm font-semibold group-hover:gap-2 transition-all">
        <span>Explore</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}
