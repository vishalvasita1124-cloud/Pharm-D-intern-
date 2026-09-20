import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Settings,
  CheckCircle2,
  Clock,
  XCircle,
  Hourglass,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllOrders,
  approveOrder,
  rejectOrder,
  getOrderStats,
  updateSetting,
  getProductsWithPdf,
  getAdminUserAccessList,
} from '@/lib/admin';
import { getSiteSettings } from '@/lib/orders';
import { PaymentsTable } from '@/components/admin/PaymentsTable';
import { OrderDetailModal } from '@/components/admin/OrderDetailModal';
import { PdfManagementTable } from '@/components/admin/PdfManagementTable';
import { AccessManagementTable } from '@/components/admin/AccessManagementTable';
import type { AdminOrder, AdminProduct, AdminUserAccess } from '@/types';

type Tab = 'payments' | 'pdfs' | 'access' | 'settings';
type StatusFilter = 'all' | 'pending_verification' | 'pending_payment' | 'approved' | 'rejected';

export default function AdminPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('payments');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  // PDF management state
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Access management state
  const [accessList, setAccessList] = useState<AdminUserAccess[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const [ordersRes, statsRes] = await Promise.all([
      getAllOrders(statusFilter === 'all' ? undefined : statusFilter),
      getOrderStats(),
    ]);
    setOrders(ordersRes.data);
    setStats(statsRes.data);
    setOrdersLoading(false);
  }, [statusFilter]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    const { data } = await getProductsWithPdf();
    setProducts(data);
    setProductsLoading(false);
  }, []);

  const loadAccess = useCallback(async () => {
    setAccessLoading(true);
    const { data } = await getAdminUserAccessList();
    setAccessList(data);
    setAccessLoading(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { getSiteSettings().then(({ data }) => setSettings(data)); }, []);

  // Load PDFs/Access lazily when tab is first opened
  useEffect(() => {
    if (tab === 'pdfs' && products.length === 0 && !productsLoading) loadProducts();
    if (tab === 'access' && accessList.length === 0 && !accessLoading) loadAccess();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (orderId: string) => {
    const { error } = await approveOrder(orderId);
    if (error) throw new Error(error);
    await loadOrders();
  };

  const handleRejectPrompt = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) setSelectedOrder(order);
  };

  const handleReject = async (orderId: string, reason: string) => {
    const { error } = await rejectOrder(orderId, reason);
    if (error) throw new Error(error);
    setSelectedOrder(null);
    await loadOrders();
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMsg('');
    setSettingsError('');
    const results = await Promise.all(
      Object.entries(settings).map(([k, v]) => updateSetting(k, v))
    );
    const errs = results.filter((r) => r.error);
    setSettingsSaving(false);
    if (errs.length) {
      setSettingsError(errs[0]?.error ?? 'Failed to save settings');
    } else {
      setSettingsMsg('Settings saved successfully!');
      setTimeout(() => setSettingsMsg(''), 3000);
    }
  };

  const statCards = [
    { key: 'pending_verification', label: 'Needs Review', icon: <Hourglass className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50 border-blue-200', color: 'text-blue-700' },
    { key: 'pending_payment', label: 'Awaiting Payment', icon: <Clock className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50 border-amber-200', color: 'text-amber-700' },
    { key: 'approved', label: 'Approved', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50 border-emerald-200', color: 'text-emerald-700' },
    { key: 'rejected', label: 'Rejected', icon: <XCircle className="w-5 h-5 text-red-500" />, bg: 'bg-red-50 border-red-200', color: 'text-red-600' },
  ];

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending_verification', label: 'Needs Review' },
    { key: 'pending_payment', label: 'Awaiting Payment' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const navTabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'payments', icon: <CreditCard className="w-4 h-4" />, label: 'Payments' },
    { key: 'pdfs', icon: <FileText className="w-4 h-4" />, label: 'PDFs' },
    { key: 'access', icon: <Users className="w-4 h-4" />, label: 'Access' },
    { key: 'settings', icon: <Settings className="w-4 h-4" />, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-10">
        <div className="container-custom">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Admin Dashboard</h1>
                <p className="text-white/60 text-sm mt-0.5">{profile?.full_name} · Admin</p>
              </div>
            </div>
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <button
              key={s.key}
              id={`stat-${s.key}`}
              onClick={() => { setTab('payments'); setStatusFilter(s.key as StatusFilter); }}
              className={`text-left rounded-2xl border p-5 hover:shadow-md transition-all ${s.bg}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">{s.icon}</div>
                <span className={`text-2xl font-extrabold ${s.color}`}>{stats[s.key] ?? 0}</span>
              </div>
              <p className="text-xs font-semibold text-gray-600">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Main panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="border-b border-gray-100 px-6">
            <div className="flex gap-0">
              {navTabs.map((t) => (
                <button
                  key={t.key}
                  id={`admin-tab-${t.key}`}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all ${tab === t.key ? 'border-medical-600 text-medical-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Payments Tab */}
            {tab === 'payments' && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {filterTabs.map((f) => (
                    <button
                      key={f.key}
                      id={`filter-${f.key}`}
                      onClick={() => setStatusFilter(f.key)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter === f.key ? 'bg-medical-700 text-white border-medical-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                      {f.label}
                      {f.key !== 'all' && stats[f.key] !== undefined && (
                        <span className="ml-1.5 opacity-70">({stats[f.key] ?? 0})</span>
                      )}
                    </button>
                  ))}
                </div>
                <PaymentsTable
                  orders={orders}
                  loading={ordersLoading}
                  onApprove={handleApprove}
                  onReject={handleRejectPrompt}
                  onViewDetail={setSelectedOrder}
                />
              </div>
            )}

            {/* PDFs Tab */}
            {tab === 'pdfs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-navy flex items-center gap-2">
                      <FileText className="w-5 h-5 text-teal-600" />
                      PDF Management
                    </h2>
                    <p className="text-gray-500 text-sm mt-0.5">Upload, replace or remove PDFs for each product.</p>
                  </div>
                  <button
                    onClick={loadProducts}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${productsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                {productsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <PdfManagementTable products={products} onRefresh={loadProducts} />
                )}
              </div>
            )}

            {/* Access Tab */}
            {tab === 'access' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-navy flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-600" />
                      User Access
                    </h2>
                    <p className="text-gray-500 text-sm mt-0.5">View and manage who has access to each product.</p>
                  </div>
                  <button
                    onClick={loadAccess}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${accessLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                {accessLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <AccessManagementTable accessList={accessList} onRefresh={loadAccess} />
                )}
              </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
              <div className="max-w-lg space-y-6">
                <div>
                  <h2 className="font-bold text-navy mb-1 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-teal-600" />
                    Site Settings
                  </h2>
                  <p className="text-gray-500 text-sm">Configure UPI payment details shown to customers.</p>
                </div>

                {[
                  { key: 'upi_id', label: 'UPI ID', placeholder: 'e.g. yourname@upi', hint: 'The UPI ID customers will pay to' },
                  { key: 'upi_name', label: 'UPI Display Name', placeholder: 'e.g. Pharm D Intern Notes', hint: 'Name shown in UPI apps' },
                  { key: 'upi_note', label: 'Payment Instruction', placeholder: 'e.g. Add order number in remarks', hint: 'Shown below the QR code' },
                ].map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`setting-${f.key}`} className="block text-sm font-medium text-navy mb-1.5">{f.label}</label>
                    <input
                      id={`setting-${f.key}`}
                      type="text"
                      value={settings[f.key] ?? ''}
                      onChange={(e) => setSettings((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-400"
                    />
                    <p className="text-gray-400 text-xs mt-1">{f.hint}</p>
                  </div>
                ))}

                {settingsError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{settingsError}
                  </div>
                )}
                {settingsMsg && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />{settingsMsg}
                  </div>
                )}

                <button id="save-settings-btn" onClick={handleSaveSettings} disabled={settingsSaving} className="btn-teal">
                  {settingsSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Settings</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
