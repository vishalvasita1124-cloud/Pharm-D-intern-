import { useEffect, useState, useCallback } from 'react';
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
  Sparkles,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { getUserOrders, getUserAccessList } from '@/lib/orders';
import { getProductById } from '@/lib/notes';
import { getPdfAccess } from '@/lib/pdf';
import type { Order, UserAccess, Product } from '@/types';

interface OwnedNote {
  productId: string;
  title: string;
  grantedAt: string;
  orderNumber?: string;
  product: Product | null;
}

export default function DashboardPage() {
  const { user, profile, signOut, loading, syncPurchases } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ownedNotes, setOwnedNotes] = useState<OwnedNote[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    // Sync any purchases placed with the user's email first
    await syncPurchases();

    const [ordRes, accRes] = await Promise.all([
      getUserOrders(),
      getUserAccessList(),
    ]);

    setOrders(ordRes.data);

    // Build unified map of products the user owns (from user_access OR approved orders)
    const map = new Map<string, { productId: string; grantedAt: string; orderNumber?: string; titleFallback?: string }>();

    // 1. From user_access
    accRes.data.forEach((acc) => {
      map.set(acc.product_id, {
        productId: acc.product_id,
        grantedAt: acc.granted_at,
      });
    });

    // 2. From approved orders
    ordRes.data.forEach((ord) => {
      if (ord.status === 'approved') {
        const existing = map.get(ord.product_id);
        map.set(ord.product_id, {
          productId: ord.product_id,
          grantedAt: existing?.grantedAt || ord.updated_at || ord.created_at,
          orderNumber: ord.order_number,
          titleFallback: ord.product_title,
        });
      }
    });

    // Fetch product details for each owned note
    const items: OwnedNote[] = await Promise.all(
      Array.from(map.values()).map(async (entry) => {
        const { data: prod } = await getProductById(entry.productId);
        return {
          productId: entry.productId,
          title: prod?.title || entry.titleFallback || 'Clinical Note',
          grantedAt: entry.grantedAt,
          orderNumber: entry.orderNumber,
          product: prod,
        };
      })
    );

    setOwnedNotes(items);
    setDataLoading(false);
  }, [user, syncPurchases]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const handleDirectDownload = async (productId: string, title: string) => {
    const res = await getPdfAccess(productId);
    if (res.ok && res.signedUrl) {
      const a = document.createElement('a');
      a.href = res.signedUrl;
      a.download = `${title || 'notes'}.pdf`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } else {
      navigate(`/my-notes/${productId}/view`);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const recentOrders = orders.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-10 sm:py-12">
        <div className="container-custom">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-medical-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-teal-400 text-sm font-semibold mb-0.5">Student Dashboard</p>
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
          <div className="lg:col-span-2 space-y-8">

            {/* DIRECT ACCESS: Unlocked Notes Quick Access Card */}
            {ownedNotes.length > 0 && (
              <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-medical-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-teal-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
                        Direct Access
                      </span>
                    </div>
                    <span className="text-xs bg-white/15 px-3 py-1 rounded-full text-white font-medium">
                      {ownedNotes.length} {ownedNotes.length === 1 ? 'Note' : 'Notes'} Unlocked
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                    Open Your Clinical Notes
                  </h2>
                  <p className="text-teal-100 text-sm mb-6 max-w-xl">
                    Tap below to directly view, study, or download your full PDF notes right now.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {ownedNotes.map((note) => (
                      <div
                        key={note.productId}
                        className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl p-4 transition-all flex flex-col justify-between"
                      >
                        <div className="mb-3">
                          <p className="font-bold text-white text-sm leading-snug line-clamp-2">
                            {note.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-teal-200 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Access Active</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          <Link
                            to={`/my-notes/${note.productId}/view`}
                            id={`quick-open-note-${note.productId}`}
                            className="flex-1 py-2 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 text-medical-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Open Notes
                          </Link>
                          <button
                            onClick={() => handleDirectDownload(note.productId, note.title)}
                            title="Download PDF"
                            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* My Notes Library List */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-medical-700" />
                  <h2 className="text-xl font-bold text-navy">My Notes Library</h2>
                </div>
                <Link to="/notes" className="text-teal-600 text-sm font-semibold hover:text-teal-800 transition-colors">
                  Browse All &rarr;
                </Link>
              </div>

              {dataLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex justify-center">
                  <Spinner />
                </div>
              ) : ownedNotes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <EmptyState
                    title="No purchased notes yet"
                    description="Once you purchase and payment is verified, your notes will appear here with instant PDF access."
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
                  {ownedNotes.map((note) => (
                    <div
                      key={note.productId}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-200 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-medical-800 to-teal-700 flex items-center justify-center shrink-0">
                          <BookOpen className="w-6 h-6 text-white/80" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-navy leading-snug truncate sm:max-w-md">
                            {note.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="text-xs text-emerald-600 font-semibold">Access Unlocked</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">
                              {new Date(note.grantedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto">
                        <Link
                          to={`/my-notes/${note.productId}/view`}
                          id={`dashboard-view-pdf-${note.productId}`}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Open PDF
                        </Link>
                        <button
                          onClick={() => handleDirectDownload(note.productId, note.title)}
                          title="Download note"
                          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 text-gray-700 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                  <h2 className="text-xl font-bold text-navy">Order History</h2>
                </div>
                {orders.length > 0 && (
                  <Link to="/dashboard/orders" className="text-teal-600 text-sm font-semibold hover:text-teal-800 transition-colors">
                    View All &rarr;
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
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 hover:border-gray-200 transition-all"
                    >
                      <Link
                        to={`/orders/${order.id}`}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
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
                        <div className="min-w-0">
                          <p className="font-semibold text-navy text-sm leading-snug truncate">
                            {order.product_title}
                          </p>
                          <p className="text-gray-400 text-xs font-mono">{order.order_number}</p>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 shrink-0">
                        {order.status === 'approved' ? (
                          <Link
                            to={`/my-notes/${order.product_id}/view`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Open PDF
                          </Link>
                        ) : (
                          <StatusBadge status={order.status} />
                        )}
                        <Link to={`/orders/${order.id}`}>
                          <ChevronRight className="w-4 h-4 text-gray-300 hover:text-medical-600 transition-colors" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Sidebar: Account ──────────────────────────────────── */}
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-medical-700" />
                <h2 className="text-xl font-bold text-navy">Account Details</h2>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {[
                  { icon: <User className="w-4 h-4 text-gray-400" />, label: 'Full Name', value: profile?.full_name || 'Student' },
                  { icon: <Mail className="w-4 h-4 text-gray-400" />, label: 'Email', value: user?.email || '—' },
                  { icon: <Phone className="w-4 h-4 text-gray-400" />, label: 'Mobile', value: profile?.mobile || '—' },
                ].map((row) => (
                  <div key={row.label} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {row.icon}
                      <span className="text-xs font-medium text-gray-500">{row.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-navy truncate max-w-[170px]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick links & support */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-navy text-sm">Need Assistance?</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                If your payment was sent but your note isn&apos;t showing as approved, share your payment receipt on WhatsApp for instant activation.
              </p>
              <a
                href="https://wa.me/919512184197?text=Hi%2C%20I%20have%20paid%20for%20notes%20on%20Pharm%20D%20Intern%20and%20need%20my%20account%20activated"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <span>WhatsApp Support (+91 9512184197)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
