import React from 'react';
import { X, CheckSquare } from 'lucide-react';

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
}

interface BulkActionBarProps {
  count: number;
  total: number;
  actions: BulkAction[];
  onClear: () => void;
  onSelectAll: () => void;
}

export default function BulkActionBar({ count, total, actions, onClear, onSelectAll }: BulkActionBarProps) {
  const isAllSelected = count === total && total > 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#1C4B42',
        transform: count > 0 ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        pointerEvents: count > 0 ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 24px env(safe-area-inset-bottom, 12px)',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: count + clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 600 }}>
            {count} of {total} selected
          </span>
          <button
            onClick={onClear}
            title="Clear selection"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

        {/* Middle: Select All */}
        {!isAllSelected && (
          <button
            onClick={onSelectAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'transparent',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <CheckSquare size={13} />
            Select All
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right: Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {actions.map((action, idx) => {
            let bg = 'transparent';
            let border = '1px solid rgba(255,255,255,0.35)';
            let color = '#ffffff';

            if (action.variant === 'danger') {
              bg = 'rgba(239,68,68,0.18)';
              border = '1px solid rgba(239,68,68,0.55)';
              color = '#fca5a5';
            } else if (action.variant === 'primary') {
              bg = '#86CA0F';
              border = '1px solid #86CA0F';
              color = '#0f2d00';
            }

            return (
              <button
                key={idx}
                onClick={action.onClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  border,
                  background: bg,
                  color,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
