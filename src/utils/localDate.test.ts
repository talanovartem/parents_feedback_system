import { describe, it, expect } from 'vitest';
import { toLocalIsoDate } from './localDate';

describe('toLocalIsoDate', () => {
  it('форматує локальну дату без зсуву UTC', () => {
    // 00:30 локально — toISOString() у поясах UTC+1..+14 дає попередній день
    const d = new Date(2026, 0, 5, 0, 30);
    expect(toLocalIsoDate(d)).toBe('2026-01-05');
  });

  it('доповнює нулями місяць і день', () => {
    expect(toLocalIsoDate(new Date(2026, 2, 3))).toBe('2026-03-03');
  });

  it('працює з річними межами', () => {
    expect(toLocalIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});
