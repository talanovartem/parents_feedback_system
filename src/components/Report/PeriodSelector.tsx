import React, { useState, useEffect } from 'react';
import { getPeriodPresets, PeriodPreset } from '../../utils/periodHelper';
import { Calendar, Clock, ChevronDown } from 'lucide-react';

interface PeriodSelectorProps {
  value: string;
  onChange: (periodText: string, startDate?: string, endDate?: string) => void;
  className?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const presets = getPeriodPresets();
  const defaultPreset = presets[0]; // 'current-week'

  const [selectedPresetId, setSelectedPresetId] = useState<string>('current-week');
  const [customText, setCustomText] = useState<string>(value || defaultPreset.description);
  const [dateBounds, setDateBounds] = useState({ from: defaultPreset.startDate || '', to: defaultPreset.endDate || '' });

  useEffect(() => {
    if (!value && defaultPreset) {
      onChange(defaultPreset.description, defaultPreset.startDate, defaultPreset.endDate);
    }
    // Лише ініціалізація при монтуванні: подальші зміни value/onChange керуються вручну
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPreset = (preset: PeriodPreset) => {
    setSelectedPresetId(preset.id);
    setCustomText(preset.description);
    const from = preset.startDate || dateBounds.from;
    const to = preset.endDate || dateBounds.to;
    setDateBounds({ from, to });
    onChange(preset.description, from, to);
  };

  const handleTextChange = (newText: string) => {
    setCustomText(newText);
    setSelectedPresetId('custom');
    onChange(newText, dateBounds.from, dateBounds.to);
  };

  const handleDateChange = (field: 'from' | 'to', date: string) => {
    const next = { ...dateBounds, [field]: date };
    setDateBounds(next);
    const label = `${next.from.split('-').reverse().join('.')} – ${next.to.split('-').reverse().join('.')}`;
    setCustomText(label);
    setSelectedPresetId('custom');
    onChange(label, next.from, next.to);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Dropdown Preset Selector */}
        <div className="relative inline-block">
          <select
            aria-label="Звітний період"
            value={selectedPresetId}
            onChange={(e) => {
              const found = presets.find((p) => p.id === e.target.value);
              if (found) handleSelectPreset(found);
            }}
            className="appearance-none text-xs font-semibold pl-8 pr-8 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer shadow-xs"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Calendar className="w-3.5 h-3.5 text-indigo-600 absolute left-2.5 top-2.5 pointer-events-none" />
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* Editable Date / Period Text */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
            Дати у промпті:
          </span>
          <input
            type="text"
            aria-label="Назва звітного періоду"
            value={customText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Наприклад: 15.09.2026 – 21.09.2026"
            className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
            title="Ви можете відредагувати текст періоду вручну"
          />
        </div>
      </div>

      {selectedPresetId === 'custom' && <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <label className="flex items-center gap-1">Від <input type="date" value={dateBounds.from} onChange={(event) => handleDateChange('from', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5" /></label>
        <label className="flex items-center gap-1">До <input type="date" value={dateBounds.to} onChange={(event) => handleDateChange('to', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5" /></label>
      </div>}

      {/* Helper notice */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
        <span>
          Звітний період: <strong className="text-slate-700">{customText}</strong> (підставляється у запит для ШІ)
        </span>
      </div>
    </div>
  );
};
