import type { CompanyStatus } from '../../data/types';
import { cn } from '../../lib/utils';

interface Props {
  status: CompanyStatus;
}

const config: Record<CompanyStatus, { label: string; className: string }> = {
  Active: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Watch: {
    label: 'Watch',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Exited: {
    label: 'Exited',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
};

export default function StatusBadge({ status }: Props) {
  const { label, className } = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        className
      )}
    >
      {label}
    </span>
  );
}
