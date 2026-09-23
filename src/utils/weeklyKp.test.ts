import { describe, it, expect } from 'vitest';
import { calcRecommendedKp, getWeekPeriod, isoWeek } from './weeklyKp';
import { createEmptyDatabase } from '../services/migration';
import { DatabaseSchema } from '../types/feedback';

describe('isoWeek', () => {
  it('31.12.2026 належить 2026-W53', () => {
    expect(isoWeek(new Date(2026, 11, 31))).toEqual({ year: 2026, week: 53 });
  });

  it('01.01.2027 належить до 2026-W53 (п’ятниця після четверга)', () => {
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ year: 2026, week: 53 });
  });

  it('звичайний робочий тиждень', () => {
    const { week } = isoWeek(new Date(2026, 8, 23)); // 23.09.2026 — середа
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });
});

describe('getWeekPeriod', () => {
  it('повертає валідні межі та ISO-ключ', () => {
    const w = getWeekPeriod(0);
    expect(w.monDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(w.friDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(w.monDate <= w.friDate).toBe(true);
    expect(w.iso).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('попередній тиждень закінчується раніше поточного', () => {
    const cur = getWeekPeriod(0);
    const prev = getWeekPeriod(-1);
    expect(prev.friDate < cur.monDate).toBe(true);
  });
});

describe('calcRecommendedKp', () => {
  const base = (): DatabaseSchema => {
    const db = createEmptyDatabase();
    db.classes.push({ id: 'c1', name: '8-А' });
    db.students.push({ id: 's1', classId: 'c1', name: 'Тест Учень' });
    return db;
  };
  const student = (db: DatabaseSchema) => db.students[0];
  const MON = '2026-09-21';
  const FRI = '2026-09-25';

  it('немає уроків — 0 балів', () => {
    const db = base();
    expect(calcRecommendedKp(student(db), db, MON, FRI).total).toBe(0);
  });

  it('уроки без записів не дають +5 за «100% відвідуваність»', () => {
    const db = base();
    db.lessons.push({ id: 'l1', classId: 'c1', date: '2026-09-22', lessonNumber: 1 });
    const res = calcRecommendedKp(student(db), db, MON, FRI);
    expect(res.total).toBe(0);
    expect(res.breakdown.some((b) => b.includes('100%'))).toBe(false);
  });

  it('повністю відпрацьований тиждень без пропусків — +5', () => {
    const db = base();
    db.lessons.push({ id: 'l1', classId: 'c1', date: '2026-09-22', lessonNumber: 1 });
    db.records['s1'] = { l1: { scores: {} } };
    const res = calcRecommendedKp(student(db), db, MON, FRI);
    expect(res.breakdown).toContain('+5 (100% відвідуваність)');
  });

  it('один пропуск — +2', () => {
    const db = base();
    db.lessons.push({ id: 'l1', classId: 'c1', date: '2026-09-22', lessonNumber: 1 });
    db.lessons.push({ id: 'l2', classId: 'c1', date: '2026-09-24', lessonNumber: 2 });
    db.records['s1'] = { l1: { scores: {} }, l2: { scores: {}, absent: true } };
    const res = calcRecommendedKp(student(db), db, MON, FRI);
    expect(res.breakdown).toContain('+2 (пропуск: 1)');
  });
});
