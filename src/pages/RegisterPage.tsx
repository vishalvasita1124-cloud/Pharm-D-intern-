import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, AlertCircle, CheckCircle2, User, Mail, Phone, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

interface FormData {
  full_name: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

const INITIAL: FormData = {
  full_name: '',
  username: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
};

function FieldIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
      {icon}
    </div>
  );
}

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const update = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.full_name.trim()) return 'Full name is required.';
    if (form.username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!/^[a-z0-9_]+$/i.test(form.username)) return 'Username may only contain letters, numbers and underscores.';
    if (!form.email.includes('@')) return 'Please enter a valid email address.';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return 'Please enter a valid 10-digit Indian mobile number.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    const { error } = await signUp({
      email: form.email,
      password: form.password,
      full_name: form.full_name.trim(),
      username: form.username.trim().toLowerCase(),
      mobile: form.mobile.trim(),
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Try logging in instead.');
      } else if (error.message.toLowerCase().includes('unique')) {
        setError('That username is already taken. Please choose another.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-950 to-teal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
          <p className="text-gray-300">Redirecting you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-950 via-medical-900 to-teal-900 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-80 h-80 rounded-full bg-medical-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-medical-600 to-teal-500 flex items-center justify-center shadow-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white mt-4 mb-1">Create your account</h1>
          <p className="text-gray-400">Join Pharm D Intern Notes — it's free</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} id="register-form" noValidate>
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/20 border border-red-500/30 rounded-xl p-3.5 mb-5">
                <AlertCircle className="w-4 h-4 text-red-300 mt-0.5 shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Full name */}
              <div className="sm:col-span-2">
                <label htmlFor="reg-fullname" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FieldIcon icon={<User className="w-4 h-4" />} />
                  <input
                    id="reg-fullname"
                    type="text"
                    autoComplete="name"
                    required
                    value={form.full_name}
                    onChange={update('full_name')}
                    placeholder="Dr. Jane Smith"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="reg-username" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Username <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FieldIcon icon={<span className="text-xs font-bold text-gray-400">@</span>} />
                  <input
                    id="reg-username"
                    type="text"
                    autoComplete="username"
                    required
                    value={form.username}
                    onChange={update('username')}
                    placeholder="pharmdintern"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label htmlFor="reg-mobile" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Mobile <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FieldIcon icon={<Phone className="w-4 h-4" />} />
                  <input
                    id="reg-mobile"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={form.mobile}
                    onChange={update('mobile')}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FieldIcon icon={<Mail className="w-4 h-4" />} />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={update('email')}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FieldIcon icon={<Lock className="w-4 h-4" />} />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={update('password')}
                    placeholder="Min 8 characters"
                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    id="reg-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-200 mb-1.5">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FieldIcon icon={<Lock className="w-4 h-4" />} />
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                    placeholder="Re-enter password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                  {form.confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {form.password === form.confirmPassword
                        ? <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        : <AlertCircle className="w-4 h-4 text-red-400" />
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-gray-400 text-xs mb-5">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-teal-400 hover:underline">Terms</Link> and{' '}
              <Link to="/privacy" className="text-teal-400 hover:underline">Privacy Policy</Link>.
            </p>

            <button
              type="submit"
              id="register-submit-btn"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-base
                         hover:from-teal-600 hover:to-teal-700 active:scale-95 transition-all shadow-lg
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner size="sm" className="text-white" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" id="register-login-link" className="text-teal-400 hover:text-teal-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
