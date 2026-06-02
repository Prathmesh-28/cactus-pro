import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table2, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExportOption {
  label: string;
  format: 'pdf' | 'excel';
  icon?: React.ReactNode;
  onExport: () => void | Promise<void>;
}

interface Props {
  options: ExportOption[];
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'outline';
}

export default function ExportMenu({ options, label = 'Export', size = 'md', variant = 'outline' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (opt: ExportOption) => {
    setLoading(opt.label);
    setOpen(false);
    try { await opt.onExport(); }
    finally { setLoading(null); }
  };

  const btnCls = cn(
    'flex items-center gap-1.5 font-medium rounded-lg transition-colors whitespace-nowrap',
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
    variant === 'outline'
      ? 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
      : 'text-white'
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={btnCls}
        style={variant === 'default' ? { backgroundColor: '#1C4B42' } : {}}
        disabled={loading !== null}
      >
        {loading
          ? <Loader2 className={cn('animate-spin', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
          : <Download className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />}
        {loading ? 'Generating…' : label}
        <ChevronDown className={cn('transition-transform', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Download as</p>
          </div>
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={() => handleExport(opt)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              {opt.format === 'pdf'
                ? <FileText className="w-4 h-4 text-red-500 shrink-0" />
                : <Table2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              <div>
                <p className="font-medium text-xs">{opt.label}</p>
                <p className="text-[10px] text-gray-400">{opt.format === 'pdf' ? 'PDF document' : 'Excel spreadsheet'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
