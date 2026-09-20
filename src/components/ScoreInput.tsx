import React from 'react';
import { getScoreBadgeClass, sanitizeScore } from '../utils/scoreColors';

interface ScoreInputProps {
  value?: number;
  onChange: (val: number | null) => void;
  ariaLabel?: string;
  disabled?: boolean;
  tableId?: string;
  rowIndex?: number;
  colIndex?: number;
  onToggleAbsent?: () => void;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  ariaLabel,
  disabled,
  tableId,
  rowIndex,
  colIndex,
  onToggleAbsent,
}) => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Швидка клавіша "н" або "n" для пропуску уроку
    if (e.key === 'н' || e.key === 'Н' || e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      if (onToggleAbsent) {
        onToggleAbsent();
      }
      return;
    }

    if (!tableId || rowIndex === undefined || colIndex === undefined) return;

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      targetRow += 1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow -= 1;
    } else if (e.key === 'ArrowRight' && (e.currentTarget.selectionStart === e.currentTarget.value.length)) {
      targetCol += 1;
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      targetCol -= 1;
    } else {
      return;
    }

    const nextEl = document.querySelector<HTMLInputElement>(
      `input[data-table-id="${tableId}"][data-row="${targetRow}"][data-col="${targetCol}"]`
    );
    if (nextEl) {
      nextEl.focus();
      nextEl.select();
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        data-table-id={tableId}
        data-row={rowIndex}
        data-col={colIndex}
        value={disabled ? '' : (value !== undefined && value !== null ? value : '')}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? '—' : '-'}
        aria-label={ariaLabel}
        className={`w-9 h-8 text-center text-xs font-semibold border rounded-md transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none ${badgeClass}`}
      />
    </div>
  );
};
