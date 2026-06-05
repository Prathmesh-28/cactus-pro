import { type LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-400 max-w-xs">{description}</p>
      {action && (
        <button onClick={action.onClick}
          className="mt-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-700 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
