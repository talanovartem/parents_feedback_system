import React from 'react';
import { getScoreBadgeClass, sanitizeScore } from '../utils/scoreColors';

interface ScoreInputProps {
  value?: number;
  onChange: (val: number | null) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({ value, onChange, ariaLabel, disabled }) => {
  const badgeClass = disabled
    ? 'bg-slate-100 text-slate-300 border-dashed border-slate-300 cursor-not-allowed opacity-60'
    : getScoreBadgeClass(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value;
    if (raw === '') {
      onChange(null);
      return;
    }
    const sanitized = sanitizeScore(raw);
    onChange(sanitized);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <input
        type="number"
        min={0}
        max={12}
        step={1}
        disabled={disabled}
        value={disabled ? '' : (value !== undefined && value !== null ? value : '')}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={disabled ? '—' : '-'}
        aria-label={ariaLabel}
        className={`w-9 h-8 text-center text-xs border rounded-md transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none ${badgeClass}`}
      />
    </div>
  );
};
