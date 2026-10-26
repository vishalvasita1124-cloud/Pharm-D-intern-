import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Mail,
  KeyRound,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

type LoginMethod = 'otp' | 'password';

export default function LoginPage() {
  const { signIn, signInWithOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/my-notes';
  const initialEmail = searchParams.get('email') ?? '';

  const [method, setMethod] = useState<LoginMethod>('otp');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Handle password sign-in
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInErr } = await signIn(email.trim(), password);

    if (signInErr) {
      setError(
        signInErr.message.includes('Invalid login')
          ? 'Invalid email or password. If you bought notes as a guest, try "Login with OTP / Code" instead.'
          : signInErr.message
      );
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  // Handle send OTP / magic link
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: otpErr } = await signInWithOtp(email.trim());

    setLoading(false);
    if (otpErr) {
      setError(otpErr.message);
    } else {
      setOtpSent(true);
      setSuccessMessage(`Login code & magic link sent to ${email.trim()}. Check your inbox!`);
    }
  };

  // Handle verify OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim()) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: verifyErr } = await verifyOtp(email.trim(), otpToken.trim());

    if (verifyErr) {
      setError(verifyErr.message || 'Invalid or expired code. Please try again.');
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-950 via-medical-900 to-teal-900 flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-medical-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-medical-600 to-teal-500 flex items-center justify-center shadow-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white mt-4 mb-1">Sign In to Access Notes</h1>
          <p className="text-gray-300 text-sm">
            Access your purchased &amp; approved clinical notes
          </p>
        </div>

        {/* Helpful notice for buyers */}
        <div className="bg-teal-500/15 border border-teal-400/30 rounded-2xl p-4 mb-5 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-teal-300 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-100 leading-relaxed">
              <strong className="text-white block mb-0.5">Bought notes recently?</strong>
              Enter the <strong>exact same email</strong> you used at checkout. Once signed in, all your approved notes and PDFs will open instantly in your library!
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Method tabs */}
          <div className="flex bg-black/20 p-1 rounded-2xl mb-6 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMethod('otp');
                setError('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                method === 'otp'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              OTP / Code (Fast)
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod('password');
                setError('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                method === 'password'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Password
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/20 border border-red-500/30 rounded-xl p-3.5 mb-5">
              <AlertCircle className="w-4 h-4 text-red-300 mt-0.5 shrink-0" />
              <p className="text-red-200 text-xs sm:text-sm">{error}</p>
            </div>
          )}

          {/* Success display */}
          {successMessage && (
            <div className="flex items-start gap-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3.5 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
              <p className="text-emerald-200 text-xs sm:text-sm">{successMessage}</p>
            </div>
          )}

          {/* ── MODE 1: OTP Login ── */}
          {method === 'otp' && (
            <>
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label htmlFor="otp-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                      Email address used at checkout
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="otp-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. rahul@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-sm hover:from-teal-600 hover:to-teal-700 active:scale-95 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Spinner size="sm" className="text-white" /> Sending Code&hellip;</>
                    ) : (
                      <>Send One-Time Login Code <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-2">
                    No password needed. We&apos;ll send a 6-digit code or magic link to your email.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label htmlFor="otp-token" className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                      Enter 6-digit Login Code
                    </label>
                    <input
                      id="otp-token"
                      type="text"
                      autoComplete="one-time-code"
                      required
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value)}
                      placeholder="123456"
                      maxLength={8}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center font-mono tracking-widest text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-sm hover:from-teal-600 hover:to-teal-700 active:scale-95 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Spinner size="sm" className="text-white" /> Verifying&hellip;</>
                    ) : (
                      <>Sign In &amp; Open Notes <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-teal-400 hover:underline"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-teal-400 hover:underline"
                    >
                      Resend code
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ── MODE 2: Password Login ── */}
          {method === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-teal-400 hover:text-teal-300 text-xs font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-sm hover:from-teal-600 hover:to-teal-700 active:scale-95 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner size="sm" className="text-white" /> Signing in&hellip;</> : 'Sign In'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-gray-300 text-xs">
              Want to create a permanent password?{' '}
              <Link
                to={`/register${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                className="text-teal-400 hover:text-teal-300 font-semibold transition-colors underline ml-1"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Secure authentication protected by Pharm D Intern Notes</span>
        </div>
      </div>
    </div>
  );
}
