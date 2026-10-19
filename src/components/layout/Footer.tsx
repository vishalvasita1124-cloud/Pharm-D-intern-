import { Link } from 'react-router-dom';
import { BookOpen, Mail, Heart, Phone, MessageCircle } from 'lucide-react';

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
            <div className="flex items-center gap-2.5">
              <a
                href="https://wa.me/919512184197?text=Hi%2C%20I%20have%20a%20query%20about%20Pharm%20D%20Intern%20Notes"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                title="Chat on WhatsApp"
                className="w-9 h-9 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white flex items-center justify-center transition-colors border border-emerald-500/30"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
              </a>
              <a
                href="tel:+919512184197"
                aria-label="Call Support"
                title="Call +91 95121 84197"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-teal-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="mailto:pharmdintern01@gmail.com"
                aria-label="Email Support"
                title="Email pharmdintern01@gmail.com"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-teal-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <Mail className="w-4 h-4" />
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

          {/* Support & Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Support & Help</h3>
            <div className="space-y-3 mb-6">
              <a
                href="https://wa.me/919512184197?text=Hi%2C%20I%20have%20a%20query%20about%20Pharm%20D%20Intern%20Notes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-emerald-400 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                </div>
                <span>WhatsApp: +91 95121 84197</span>
              </a>

              <a
                href="tel:+919512184197"
                className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-teal-400 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 text-gray-400 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span>Call: +91 95121 84197</span>
              </a>

              <a
                href="mailto:pharmdintern01@gmail.com"
                className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-teal-400 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 text-gray-400 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">pharmdintern01@gmail.com</span>
              </a>
            </div>

            <div className="flex gap-4 text-xs text-gray-400 pt-3 border-t border-white/10">
              <Link to="/privacy" className="hover:text-teal-400 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-teal-400 transition-colors">Terms</Link>
              <Link to="/faq" className="hover:text-teal-400 transition-colors">FAQ</Link>
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
