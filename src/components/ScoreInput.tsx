import React, { useEffect, useRef, useState } from 'react';
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
  const valueText = value === undefined || value === null ? '' : String(value);
  const [draft, setDraft] = useState(valueText);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastCommitted = useRef(valueText);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(valueText);
      lastCommitted.current = valueText;
    }
  }, [valueText, disabled]);

  const badgeClass = disabled
    ? 'bg-slate-100 text-slate-300 border-dashed border-slate-300 cursor-not-allowed opacity-60'
    : getScoreBadgeClass(value);

  const commit = () => {
    if (disabled) return;
    const raw = draft.trim();
    if (raw && !/^\d{1,2}$/.test(raw)) {
      setDraft(valueText);
      return;
    }
    const score = raw ? sanitizeScore(raw) : null;
    const normalized = score === null ? '' : String(score);
    setDraft(normalized);
    if (normalized !== lastCommitted.current) {
      lastCommitted.current = normalized;
      onChange(score);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Швидка клавіша "н" або "n" для пропуску уроку
    if (e.key === 'н' || e.key === 'Н' || e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      if (onToggleAbsent) {
        setDraft(valueText);
        onToggleAbsent();
      }
      return;
    }

    if (e.key === 'Escape') {
      setDraft(valueText);
      return;
    }

    if (!tableId || rowIndex === undefined || colIndex === undefined) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
        e.currentTarget.blur();
      }
      return;
    }

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      commit();
      targetRow += 1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      commit();
      targetRow -= 1;
    } else if (e.key === 'ArrowRight' && (e.currentTarget.selectionStart === e.currentTarget.value.length)) {
      e.preventDefault();
      commit();
      targetCol += 1;
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      commit();
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
        ref={inputRef}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        data-table-id={tableId}
        data-row={rowIndex}
        data-col={colIndex}
        value={disabled ? '' : draft}
        onChange={(event) => { if (/^\d{0,2}$/.test(event.target.value)) setDraft(event.target.value); }}
        onBlur={commit}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? '—' : '-'}
        aria-label={ariaLabel}
        className={`w-9 h-8 text-center text-xs font-semibold border rounded-md transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none ${badgeClass}`}
      />
    </div>
  );
};
