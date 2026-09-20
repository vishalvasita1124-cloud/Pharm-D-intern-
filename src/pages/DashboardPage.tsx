import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Package,
  User,
  LogOut,
  Mail,
  Phone,
  AtSign,
  ExternalLink,
  ChevronRight,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Hourglass,
  XCircle,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { getUserOrders, getUserAccessList } from '@/lib/orders';
import { getProductById } from '@/lib/notes';
import type { Order, UserAccess, Product } from '@/types';

export default function DashboardPage() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [accessList, setAccessList] = useState<UserAccess[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<{ acc: UserAccess; product: Product | null }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getUserOrders(), getUserAccessList()]).then(async ([ordRes, accRes]) => {
      setOrders(ordRes.data);
      setAccessList(accRes.data);
      // Fetch product details for each access record
      const withProducts = await Promise.all(
        accRes.data.map(async (acc) => {
          const { data: product } = await getProductById(acc.product_id);
          return { acc, product };
        }),
      );
      setPurchasedProducts(withProducts);
      setDataLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  // Recent orders (last 3)
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-12">
        <div className="container-custom">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-medical-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-teal-400 text-sm font-semibold mb-0.5">Dashboard</p>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                  Welcome, {firstName} 👋
                </h1>
                {profile?.role === 'admin' && (
                  <Badge variant="green" className="mt-1">Admin</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500/20 border border-teal-400/30 text-white text-sm font-semibold hover:bg-teal-500/30 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
              <button
                id="dashboard-logout-btn"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main column ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* My Purchased Notes */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-medical-700" />
                  <h2 className="text-xl font-bold text-navy">My Notes</h2>
                </div>
                <Link to="/notes" className="text-medical-600 text-sm font-semibold hover:text-medical-800 transition-colors">
                  Browse All →
                </Link>
              </div>

              {dataLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex justify-center">
                  <Spinner />
                </div>
              ) : purchasedProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <EmptyState
                    title="No purchased notes yet"
                    description="Once you purchase and we verify your payment, notes will appear here."
                    icon={<Package className="w-10 h-10 text-medical-400" />}
                    action={
                      <Link to="/notes" id="dashboard-explore-notes-btn" className="btn-primary">
                        <BookOpen className="w-4 h-4" />
                        Explore Notes
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {purchasedProducts.map(({ acc, product }) => (
                    <div
                      key={acc.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-medical-800 to-teal-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-white/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy leading-snug">{product?.title ?? 'Loading…'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs text-emerald-600 font-semibold">Purchased</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {new Date(acc.granted_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                      {product?.file_path ? (
                        <Link
                          to={`/my-notes/${acc.product_id}/view`}
                          id={`dashboard-view-pdf-${acc.product_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View PDF
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400 italic shrink-0">PDF coming soon</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* My Recent Orders */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-medical-700" />
                  <h2 className="text-xl font-bold text-navy">Recent Orders</h2>
                </div>
                {orders.length > 0 && (
                  <Link to="/dashboard/orders" className="text-medical-600 text-sm font-semibold hover:text-medical-800 transition-colors">
                    View All →
                  </Link>
                )}
              </div>

              {dataLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex justify-center">
                  <Spinner />
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                  <ShoppingCart className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      id={`dashboard-order-${order.id}`}
                      className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-medical-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                          {order.status === 'approved' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : order.status === 'pending_verification' ? (
                            <Hourglass className="w-4 h-4 text-blue-500" />
                          ) : order.status === 'rejected' ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-navy text-sm leading-snug">{order.product_title}</p>
                          <p className="text-gray-400 text-xs font-mono">{order.order_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={order.status} />
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-medical-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Browse notes CTA */}
            <Link
              to="/notes"
              id="dashboard-browse-cta"
              className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-5 hover:border-medical-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-medical-50 group-hover:bg-medical-100 flex items-center justify-center text-medical-700 transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-navy">Browse All Notes</div>
                  <div className="text-gray-400 text-sm">8 clinical notes available</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* ── Sidebar: Account ──────────────────────────────────── */}
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-medical-700" />
                <h2 className="text-xl font-bold text-navy">Account</h2>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {[
                  { icon: <User className="w-4 h-4 text-gray-400" />, label: 'Full Name', value: profile?.full_name ?? '—' },
                  { icon: <AtSign className="w-4 h-4 text-gray-400" />, label: 'Username', value: profile?.username ? `@${profile.username}` : '—' },
                  { icon: <Mail className="w-4 h-4 text-gray-400" />, label: 'Email', value: profile?.email ?? user?.email ?? '—' },
                  { icon: <Phone className="w-4 h-4 text-gray-400" />, label: 'Mobile', value: profile?.mobile ?? '—' },
                ].map((field) => (
                  <div key={field.label} className="flex items-start gap-3 p-4">
                    <div className="mt-0.5">{field.icon}</div>
                    <div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{field.label}</div>
                      <div className="text-navy text-sm font-medium break-all">{field.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Sign out card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-navy mb-3">Account Actions</h3>
              <div className="space-y-2">
                <Link
                  to="/dashboard/orders"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
                >
                  <Package className="w-4 h-4" />
                  My Orders
                </Link>
                <button
                  id="dashboard-logout-secondary"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 active:scale-95 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
