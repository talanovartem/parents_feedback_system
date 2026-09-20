import React from 'react';
import { getScoreBadgeClass, sanitizeScore } from '../utils/scoreColors';

interface ScoreInputProps {
  value?: number;
  onChange: (val: number | null) => void;
  ariaLabel?: string;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({ value, onChange, ariaLabel }) => {
  const badgeClass = getScoreBadgeClass(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        value={value !== undefined && value !== null ? value : ''}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="-"
        aria-label={ariaLabel}
        className={`w-9 h-8 text-center text-xs border rounded-md transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none ${badgeClass}`}
      />
    </div>
  );
};
