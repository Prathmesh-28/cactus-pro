import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { FundMetric } from '../../data/types';
import { cn } from '../../lib/utils';

interface Props {
  metric: FundMetric;
}

export default function MetricCard({ metric }: Props) {
  const { label, value, delta, deltaDirection } = metric;

  const DeltaIcon =
    deltaDirection === 'up'
      ? TrendingUp
      : deltaDirection === 'down'
      ? TrendingDown
      : Minus;

  const deltaColor =
    deltaDirection === 'up'
      ? 'text-emerald-600'
      : deltaDirection === 'down'
      ? 'text-red-500'
      : 'text-gray-400';

  // Compact, overflow-proof card: smaller padding, the value scales down for long
  // numbers (clamp via the `big`/`huge` length test) and is allowed to wrap, so even
  // values like "₹456000000 Cr+" stay inside the box instead of spilling out.
  const v = String(value ?? '');
  const valueSize =
    v.length > 14 ? 'text-sm'
    : v.length > 10 ? 'text-base'
    : v.length > 7  ? 'text-lg'
    : 'text-xl';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-shadow flex flex-col gap-1 min-w-0">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-tight line-clamp-2">
        {label}
      </p>
      <p className={cn('font-heading font-bold text-gray-900 leading-tight break-words min-w-0', valueSize)}>
        {value}
      </p>
      {delta && (
        <div className={cn('flex items-center gap-1 text-[11px] font-medium min-w-0', deltaColor)}>
          <DeltaIcon className="w-3 h-3 shrink-0" />
          <span className="truncate">{delta}</span>
        </div>
      )}
    </div>
  );
}
