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

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-2xl font-heading font-bold text-gray-900 mb-2">{value}</p>
      {delta && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', deltaColor)}>
          <DeltaIcon className="w-3.5 h-3.5" />
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}
