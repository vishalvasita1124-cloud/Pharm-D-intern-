import { clsx } from 'clsx';
import { Clock, Hourglass, CheckCircle2, XCircle, Ban } from 'lucide-react';
import type { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; classes: string }
> = {
  pending_payment: {
    label: 'Awaiting Payment',
    icon: <Clock className="w-3.5 h-3.5" />,
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  pending_verification: {
    label: 'Under Review',
    icon: <Hourglass className="w-3.5 h-3.5" />,
    classes: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  approved: {
    label: 'Approved',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    icon: <XCircle className="w-3.5 h-3.5" />,
    classes: 'bg-red-100 text-red-700 border-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Ban className="w-3.5 h-3.5" />,
    classes: 'bg-gray-100 text-gray-500 border-gray-200',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold',
        cfg.classes,
        className
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
