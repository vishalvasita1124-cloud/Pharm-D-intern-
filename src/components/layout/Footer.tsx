import { Link } from 'react-router-dom';
import { BookOpen, Mail, Heart, Globe } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy text-gray-300">
      {/* Top section */}
      <div className="container-custom py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-medical-600 to-teal-500 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-white text-lg leading-none">Pharm D</div>
                <div className="text-teal-400 font-semibold text-sm leading-none">Intern Notes</div>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Practical, concise and ward-ready notes designed for Pharm D students, interns and clinical pharmacy learners.
            </p>
            <div className="flex gap-3">
              <a
                href="mailto:hello@pharmdintern.notes"
                aria-label="Email"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-teal-600 flex items-center justify-center transition-colors"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="Website"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-teal-600 flex items-center justify-center transition-colors"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { to: '/notes', label: 'Browse Notes' },
                { to: '/categories', label: 'Categories' },
                { to: '/about', label: 'About Us' },
                { to: '/faq', label: 'FAQ' },
                { to: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-gray-400 hover:text-teal-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Categories</h3>
            <ul className="space-y-2.5">
              {[
                { to: '/categories#clinical-pharmacy', label: 'Clinical Pharmacy' },
                { to: '/categories#diagnostic-skills', label: 'Diagnostic Skills' },
                { to: '/categories#therapeutics', label: 'Therapeutics' },
                { to: '/categories#clinical-research', label: 'Clinical Research' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-gray-400 hover:text-teal-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2.5">
              {[
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms & Conditions' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-gray-400 hover:text-teal-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <div className="inline-flex items-center gap-1.5 bg-teal-900/50 border border-teal-700/50 rounded-xl px-4 py-3">
                <span className="text-xs text-teal-300 font-medium">
                  📚 Designed for Pharm D learners
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-custom py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">
            © {year} Pharm D Intern Notes. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" /> for clinical pharmacy learners
          </p>
        </div>
      </div>
    </footer>
  );
}
