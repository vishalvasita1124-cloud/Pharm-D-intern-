import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, AlertCircle, CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-950 via-medical-900 to-teal-900 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-0 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-1/3 left-0 w-80 h-80 rounded-full bg-medical-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-medical-600 to-teal-500 flex items-center justify-center shadow-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white mt-4 mb-1">Reset Password</h1>
          <p className="text-gray-400">Enter your email and we'll send you a reset link</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-teal-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Check your email</h2>
              <p className="text-gray-300 text-sm mb-6">
                We've sent a password reset link to <strong className="text-white">{email}</strong>.
                Please check your inbox and spam folder.
              </p>
              <Link to="/login" id="forgot-back-to-login" className="text-teal-400 hover:text-teal-300 font-semibold text-sm transition-colors">
                ← Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="forgot-password-form" noValidate>
              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/20 border border-red-500/30 rounded-xl p-3.5 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-300 mt-0.5 shrink-0" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <div className="mb-5">
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="forgot-submit-btn"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold
                           hover:from-teal-600 hover:to-teal-700 active:scale-95 transition-all shadow-lg
                           disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner size="sm" className="text-white" /> Sending...</> : <>
                  <Mail className="w-4 h-4" /> Send Reset Link
                </>}
              </button>

              <div className="text-center mt-5">
                <Link
                  to="/login"
                  id="forgot-login-link"
                  className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
