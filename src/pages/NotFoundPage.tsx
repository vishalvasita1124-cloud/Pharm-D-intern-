import { Link } from 'react-router-dom';
import { BookOpen, Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-950 to-teal-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 number */}
        <div className="text-9xl font-extrabold text-white/10 mb-4 leading-none select-none">404</div>
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-teal-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">Page Not Found</h1>
        <p className="text-gray-300 mb-8 leading-relaxed">
          Looks like this page has gone on ward rounds without us. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            id="404-home-btn"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-medical-800 font-bold hover:bg-gray-100 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            to="/notes"
            id="404-browse-btn"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-white/30 text-white font-bold hover:bg-white/10 active:scale-95 transition-all"
          >
            <Search className="w-4 h-4" />
            Browse Notes
          </Link>
        </div>
      </div>
    </div>
  );
}
