import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ArrowRight,
  BookOpen,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrders } from '@/lib/orders';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Order } from '@/types';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserOrders().then(({ data }) => {
      setOrders(data);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-10">
        <div className="container-custom">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">My Orders</h1>
              <p className="text-white/60 text-sm mt-0.5">Track your purchases and payment status</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package className="w-10 h-10 text-gray-300" />}
            title="No orders yet"
            description="Browse our notes and make your first purchase"
            action={
              <Link to="/notes" className="btn-primary">
                <BookOpen className="w-4 h-4" />
                Browse Notes
              </Link>
            }
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                id={`order-link-${order.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-medical-200 transition-all duration-200 p-5 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-medical-800 to-teal-700 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-white/80" />
                    </div>
                    <div>
                      <p className="font-bold text-navy mb-1 leading-snug">{order.product_title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={order.status} />
                        <span className="font-mono text-xs text-gray-400">{order.order_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-4 sm:shrink-0">
                    <div className="text-right">
                      <p className="font-extrabold text-navy">₹{order.amount}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-medical-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {order.rejection_reason && (
                  <div className="mt-3 pt-3 border-t border-red-100 text-xs text-red-600 flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Rejection reason: {order.rejection_reason}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
