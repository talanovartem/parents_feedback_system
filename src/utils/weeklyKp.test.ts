import { describe, it, expect } from 'vitest';
import { calcRecommendedKp, canAddKpAwards, getKpCoverage, getKpPeriodDates, getKpPeriodKey, getWeekPeriod, isoWeek, kpPeriodsOverlap } from './weeklyKp';
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

  it('дозволяє вибрати тиждень кілька місяців тому', () => {
    const older = getWeekPeriod(-12);
    const previous = getWeekPeriod(-1);
    expect(older.friDate < previous.monDate).toBe(true);
  });
});

describe('getKpPeriodKey', () => {
  it('той самий тиждень має один ключ і в ручному виборі', () => {
    const week = getWeekPeriod(-2);
    expect(getKpPeriodKey(week.monDate, week.friDate)).toBe(week.iso);
  });

  it('довільний проміжок має власний ключ', () => {
    expect(getKpPeriodKey('2026-09-01', '2026-09-30')).toBe('range:2026-09-01:2026-09-30');
  });
});

describe('kpPeriodsOverlap', () => {
  it('бачить перетин довільного проміжку з тижнем, але не сусіднього тижня', () => {
    expect(getKpPeriodDates('2026-W40')).toEqual({ from: '2026-09-28', to: '2026-10-02' });
    expect(kpPeriodsOverlap('2026-W40', 'range:2026-10-01:2026-10-04')).toBe(true);
    expect(kpPeriodsOverlap('2026-W40', '2026-W41')).toBe(false);
  });
});

describe('KP coverage and duplicate protection', () => {
  const db = () => {
    const data = createEmptyDatabase();
    data.classes = [{ id: 'c1', name: '8-А' }];
    data.students = [{ id: 's1', classId: 'c1', name: 'Учень' }];
    data.lessons = [
      { id: 'l1', classId: 'c1', date: '2026-09-22', lessonNumber: 1 },
      { id: 'l2', classId: 'c1', date: '2026-09-29', lessonNumber: 1 },
    ];
    data.records.s1 = { l1: { scores: {} }, l2: { scores: {} } };
    return data;
  };

  it('показує оплачений і пропущений тижні з уроками', () => {
    const data = db();
    data.kpTransactions = [{ id: 'k1', studentId: 's1', amount: 5, reason: 'Тиждень', weekPeriod: '2026-W39', createdAt: '2026-09-25T10:00:00Z' }];
    expect(getKpCoverage(data, ['c1'], '2026-10-01').map((week) => [week.key, week.awarded, week.missing])).toEqual([
      ['2026-W40', 0, 1], ['2026-W39', 1, 0],
    ]);
  });

  it('блокує повторний та перекривний період, але дозволяє новий', () => {
    const data = db();
    data.kpTransactions = [{ id: 'k1', studentId: 's1', amount: 5, reason: 'Тиждень', weekPeriod: '2026-W39', createdAt: '2026-09-25T10:00:00Z' }];
    expect(canAddKpAwards(data, [{ studentId: 's1', amount: 5, reason: 'Повтор', weekPeriod: '2026-W39' }])).toBe(false);
    expect(canAddKpAwards(data, [{ studentId: 's1', amount: 5, reason: 'Перетин', weekPeriod: 'range:2026-09-24:2026-09-30' }])).toBe(false);
    expect(canAddKpAwards(data, [{ studentId: 's1', amount: 5, reason: 'Новий', weekPeriod: '2026-W40' }])).toBe(true);
    data.kpTransactions.push({ id: 'revoke', studentId: 's1', amount: -5, reason: 'Скасування', weekPeriod: '2026-W39', createdAt: '2026-09-26T10:00:00Z' });
    expect(canAddKpAwards(data, [{ studentId: 's1', amount: 5, reason: 'Повтор після скасування', weekPeriod: '2026-W39' }])).toBe(true);
  });

  it('частково оплачений тиждень показує окремо', () => {
    const data = db();
    data.lessons.push({ id: 'l3', classId: 'c1', date: '2026-09-30', lessonNumber: 2 });
    data.records.s1.l3 = { scores: {} };
    data.kpTransactions = [{ id: 'k1', studentId: 's1', amount: 3, reason: 'День', weekPeriod: 'range:2026-09-29:2026-09-29', createdAt: '2026-09-29T10:00:00Z' }];
    expect(getKpCoverage(data, ['c1'], '2026-10-01')[0]).toMatchObject({ key: '2026-W40', partial: 1, awarded: 0, missing: 0 });
  });

  it('ручна операція з тим самим ключем не проходить вдруге', () => {
    const data = db();
    const manual = { studentId: 's1', amount: 3, reason: 'Допомога на уроці', operationKey: 'manual-1' };
    expect(canAddKpAwards(data, [manual])).toBe(true);
    data.kpTransactions = [{ ...manual, id: 'm1', createdAt: '2026-09-30T10:00:00Z' }];
    expect(canAddKpAwards(data, [manual])).toBe(false);
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

  it('рахує обʼєднану оцінку лише один раз для бонусу', () => {
    const db = base();
    db.lessons.push({ id: 'l1', classId: 'c1', date: '2026-09-22', lessonNumber: 1 });
    db.records.s1 = { l1: { scores: { behavior: 0, condition: 0, efficiency: 12, activity: 12 } } };

    const res = calcRecommendedKp(student(db), db, MON, FRI);

    expect(res.breakdown).toContain('+5 (сер. бал: 12.0)');
  });
});
