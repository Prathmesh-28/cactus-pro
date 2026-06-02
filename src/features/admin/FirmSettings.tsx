import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, X } from 'lucide-react';
import type { FirmConfig } from '../../data/types';

export default function FirmSettings() {
  const { store, updateFirm } = useApp();
  const [form, setForm] = useState<FirmConfig>({ ...store.firm });
  const [newLocation, setNewLocation] = useState('');
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof FirmConfig, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  };

  const addLocation = () => {
    const trimmed = newLocation.trim();
    if (trimmed && !form.locations.includes(trimmed)) {
      setForm((f) => ({ ...f, locations: [...f.locations, trimmed] }));
      setNewLocation('');
      setSaved(false);
    }
  };

  const removeLocation = (loc: string) => {
    setForm((f) => ({ ...f, locations: f.locations.filter((l) => l !== loc) }));
    setSaved(false);
  };

  const save = () => {
    updateFirm(form);
    setSaved(true);
  };

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-cactus-accent/30 bg-white';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Firm Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Firm Name</label>
          <input className={inputCls} value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
        </div>
        {/* Tagline */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tagline</label>
          <input className={inputCls} value={form.tagline} onChange={(e) => handleChange('tagline', e.target.value)} />
        </div>
        {/* Logo URL */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL</label>
          <input className={inputCls} value={form.logoUrl} onChange={(e) => handleChange('logoUrl', e.target.value)} placeholder="https://..." />
        </div>
        {/* Website */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
          <input className={inputCls} value={form.websiteUrl} onChange={(e) => handleChange('websiteUrl', e.target.value)} />
        </div>
        {/* Investor Portal */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Investor Portal URL</label>
          <input className={inputCls} value={form.investorPortalUrl} onChange={(e) => handleChange('investorPortalUrl', e.target.value)} />
        </div>
        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
          <input className={inputCls} type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
        </div>
        {/* Phone */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input className={inputCls} value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Brand Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['primaryColor', 'accentColor', 'lightColor'] as const).map((field) => {
            const labels: Record<string, string> = {
              primaryColor: 'Primary Color',
              accentColor: 'Accent Color',
              lightColor: 'Light Color',
            };
            return (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {labels[field]}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="w-10 h-9 rounded cursor-pointer border border-gray-200"
                  />
                  <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                    value={form[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                  />
                </div>
                {/* Live preview swatch */}
                <div
                  className="mt-1.5 h-2 rounded-full"
                  style={{ backgroundColor: form[field] }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Locations */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Office Locations</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {form.locations.map((loc) => (
            <span
              key={loc}
              className="flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm"
            >
              {loc}
              <button
                onClick={() => removeLocation(loc)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className={inputCls + ' flex-1'}
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Add location..."
            onKeyDown={(e) => e.key === 'Enter' && addLocation()}
          />
          <button
            onClick={addLocation}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-white"
            style={{ backgroundColor: store.firm.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          className="px-6 py-2.5 text-sm font-semibold rounded-lg text-white shadow-sm"
          style={{ backgroundColor: store.firm.primaryColor }}
        >
          Save Changes
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
