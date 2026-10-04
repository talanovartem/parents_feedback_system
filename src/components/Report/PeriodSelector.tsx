import React, { useState } from 'react';
import { getPeriodPresets, PeriodPreset } from '../../utils/periodHelper';
import { Calendar, Clock, ChevronDown } from 'lucide-react';

interface PeriodSelectorProps {
  value: string;
  startDate: string;
  endDate: string;
  onChange: (periodText: string, startDate?: string, endDate?: string) => void;
  className?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value,
  startDate,
  endDate,
  onChange,
  className = '',
}) => {
  const presets = getPeriodPresets();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() =>
    presets.find((preset) => preset.id !== 'custom' && preset.description === value &&
      preset.startDate === startDate && preset.endDate === endDate)?.id || 'custom'
  );

  const handleSelectPreset = (preset: PeriodPreset) => {
    setSelectedPresetId(preset.id);
    if (preset.id === 'custom') {
      onChange(value, startDate, endDate);
    } else {
      onChange(preset.description, preset.startDate, preset.endDate);
    }
  };

  const handleTextChange = (newText: string) => {
    setSelectedPresetId('custom');
    onChange(newText, startDate, endDate);
  };

  const handleDateChange = (field: 'from' | 'to', date: string) => {
    const next = { from: field === 'from' ? date : startDate, to: field === 'to' ? date : endDate };
    const label = `${next.from.split('-').reverse().join('.')} – ${next.to.split('-').reverse().join('.')}`;
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
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Наприклад: 15.09.2026 – 21.09.2026"
            className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
            title="Ви можете відредагувати текст періоду вручну"
          />
        </div>
      </div>

      {selectedPresetId === 'custom' && <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <label className="flex items-center gap-1">Від <input type="date" value={startDate} onChange={(event) => handleDateChange('from', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5" /></label>
        <label className="flex items-center gap-1">До <input type="date" value={endDate} onChange={(event) => handleDateChange('to', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5" /></label>
      </div>}

      {/* Helper notice */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
        <span>
          Звітний період: <strong className="text-slate-700">{value}</strong> (підставляється у запит для ШІ)
        </span>
      </div>
    </div>
  );
};
