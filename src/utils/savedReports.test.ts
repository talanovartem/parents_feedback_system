import { describe, expect, it } from 'vitest';
import { getStudentReports, isReportSent } from './savedReports';
import { SavedReport } from '../types/feedback';
import { createEmptyDatabase } from '../services/migration';

describe('getStudentReports', () => {
  it('returns only the requested student’s nonempty reports, newest first', () => {
    const reports: Record<string, SavedReport> = {
      old: { id: 'old', studentId: 'a', period: 'Минулий тиждень', content: 'Старий текст', updatedAt: '2026-09-20T10:00:00Z' },
      other: { id: 'other', studentId: 'b', period: 'Тиждень', content: 'Інший учень', updatedAt: '2026-10-01T10:00:00Z' },
      empty: { id: 'empty', studentId: 'a', period: 'Чверть', content: '  ', updatedAt: '2026-10-02T10:00:00Z' },
      current: { id: 'current', studentId: 'a', period: 'Поточний тиждень', content: 'Новий текст', updatedAt: '2026-09-30T10:00:00Z' },
    };

    expect(getStudentReports(reports, 'a').map((report) => report.id)).toEqual(['current', 'old']);
  });

  it('returns an empty list when there are no saved reports', () => {
    expect(getStudentReports(undefined, 'a')).toEqual([]);
  });
});

describe('isReportSent', () => {
  it('враховує як старий реєстр, так і sentAt збереженого звіту', () => {
    const db = createEmptyDatabase();
    db.savedReports = { 'a:тиждень': { id: 'a:тиждень', studentId: 'a', period: 'тиждень', content: 'Текст', updatedAt: '2026-09-30T10:00:00Z', sentAt: '2026-09-30T11:00:00Z' } };
    expect(isReportSent(db, 'a', 'тиждень')).toBe(true);
    expect(isReportSent(db, 'b', 'тиждень')).toBe(false);
    db.sentReports = { 'b:тиждень': '2026-09-30T11:00:00Z' };
    expect(isReportSent(db, 'b', 'тиждень')).toBe(true);
  });
});
