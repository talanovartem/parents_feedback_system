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

  useEffect(() => {
    if (!value && defaultPreset) {
      onChange(defaultPreset.description, defaultPreset.startDate, defaultPreset.endDate);
    }
  }, []);

  const handleSelectPreset = (preset: PeriodPreset) => {
    setSelectedPresetId(preset.id);
    setCustomText(preset.description);
    onChange(preset.description, preset.startDate, preset.endDate);
  };

  const handleTextChange = (newText: string) => {
    setCustomText(newText);
    setSelectedPresetId('custom');
    onChange(newText);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Dropdown Preset Selector */}
        <div className="relative inline-block">
          <select
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
            value={customText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Наприклад: 15.09.2026 – 21.09.2026"
            className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
            title="Ви можете відредагувати текст періоду вручну"
          />
        </div>
      </div>

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
