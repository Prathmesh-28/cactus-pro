import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';

interface Props {
  sectorId: string;
  size?: 'sm' | 'md';
}

export default function SectorPill({ sectorId, size = 'md' }: Props) {
  const { store } = useApp();
  const sector = store.sectors.find((s) => s.id === sectorId);
  if (!sector) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
      )}
      style={{
        backgroundColor: sector.color + '18',
        color: sector.color,
        border: `1px solid ${sector.color}30`,
      }}
    >
      {sector.name}
    </span>
  );
}
