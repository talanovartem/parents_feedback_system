import { DatabaseSchema, KpTransaction, Student } from '../types/feedback';
import { toLocalIsoDate } from './localDate';

/**
 * ISO-тиждень (Пн–Нд) для дати. Повертає рік ISO-тижня (рік найближчого четверга),
 * тому 31.12 / 01.01 не дають хибних номерів.
 */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Пн=1 .. Нд=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // найближчий четвер
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * Межі навчального тижня (Пн–Нд) з локальними датами без UTC-зсуву.
 * offset: 0 — поточний тиждень, -1 — попередній.
 */
export function getWeekPeriod(offset: number) {
  const now = new Date();
  const day = now.getDay(); // 0=Нд, 1=Пн ...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon + offset * 7);
  const fri = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 4);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  const { year, week } = isoWeek(mon);
  return {
    label: `${fmt(mon)} – ${fmt(fri)}.${fri.getFullYear()}`,
    iso: `${year}-W${String(week).padStart(2, '0')}`,
    monDate: toLocalIsoDate(mon),
    friDate: toLocalIsoDate(fri),
  };
}

/** Однаковий навчальний тиждень має той самий ключ незалежно від способу вибору дат. */
export function getKpPeriodKey(from: string, to: string): string {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (!Number.isNaN(start.getTime()) && start.getDay() === 1) {
    const friday = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4);
    if (toLocalIsoDate(friday) === to && end.getDay() === 5) {
      const { year, week } = isoWeek(start);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
  }
  return `range:${from}:${to}`;
}

export function getKpPeriodDates(key: string): { from: string; to: string } | null {
  if (key.startsWith('range:')) {
    const match = /^range:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(key);
    return match ? { from: match[1], to: match[2] } : null;
  }
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const monday = new Date(year, 0, 4 - day + 1 + (week - 1) * 7);
  if (isoWeek(monday).year !== year || isoWeek(monday).week !== week) return null;
  const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4);
  return { from: toLocalIsoDate(monday), to: toLocalIsoDate(friday) };
}

export function kpPeriodsOverlap(first: string, second: string): boolean {
  const a = getKpPeriodDates(first);
  const b = getKpPeriodDates(second);
  return !!a && !!b && a.from <= b.to && b.from <= a.to;
}

/** Враховує скасування як окремі записи журналу. */
export function getNetKpAward(transactions: KpTransaction[], studentId: string, period: string): number {
  return transactions.reduce((sum, tx) => sum + (tx.studentId === studentId && tx.weekPeriod === period ? tx.amount : 0), 0);
}

export function hasActiveKpOverlap(transactions: KpTransaction[], studentId: string, period: string): boolean {
  const keys = new Set(transactions.filter((tx) => tx.studentId === studentId && tx.weekPeriod).map((tx) => tx.weekPeriod as string));
  return [...keys].some((key) => kpPeriodsOverlap(key, period) && getNetKpAward(transactions, studentId, key) > 0);
}

export interface KpCoverageWeek {
  key: string;
  from: string;
  to: string;
  lessons: number;
  eligible: number;
  awarded: number;
  partial: number;
  missing: number;
}

/** Огляд тижнів, у які є фактичні уроки й підстави для бонусу. */
export function getKpCoverage(db: DatabaseSchema, classIds: string[], throughDate = toLocalIsoDate(new Date())): KpCoverageWeek[] {
  const selected = new Set(classIds);
  const lessonsByWeek = new Map<string, typeof db.lessons>();
  for (const lesson of db.lessons) {
    if (!selected.has(lesson.classId) || lesson.date > throughDate) continue;
    const { year, week } = isoWeek(new Date(`${lesson.date}T12:00:00`));
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    lessonsByWeek.set(key, [...(lessonsByWeek.get(key) || []), lesson]);
  }
  const transactions = db.kpTransactions || [];
  return [...lessonsByWeek.entries()].map(([key, lessons]) => {
    const dates = getKpPeriodDates(key);
    if (!dates) return null;
    let eligible = 0;
    let awarded = 0;
    let partial = 0;
    let missing = 0;
    for (const student of db.students) {
      if (!selected.has(student.classId)) continue;
      const studentLessons = lessons.filter((lesson) => lesson.classId === student.classId);
      if (!studentLessons.length) continue;
      const recommendation = calcRecommendedKp(student, db, dates.from, dates.to).total;
      const periodKeys = [...new Set(transactions.filter((tx) => tx.studentId === student.id && tx.weekPeriod).map((tx) => tx.weekPeriod as string))]
        .filter((period) => getNetKpAward(transactions, student.id, period) > 0);
      if (recommendation <= 0 && periodKeys.length === 0) continue;
      eligible++;
      const lessonDates = [...new Set(studentLessons.map((lesson) => lesson.date))];
      const paidDates = lessonDates.filter((date) => periodKeys.some((period) => {
        const bounds = getKpPeriodDates(period);
        return bounds && date >= bounds.from && date <= bounds.to;
      }));
      if (paidDates.length === lessonDates.length) awarded++;
      else if (paidDates.length > 0) partial++;
      else missing++;
    }
    return { key, ...dates, lessons: lessons.length, eligible, awarded, partial, missing };
  }).filter((week): week is KpCoverageWeek => !!week)
    .sort((a, b) => b.from.localeCompare(a.from));
}

export type NewKpAward = Omit<KpTransaction, 'id' | 'createdAt'>;

/** Перевірка також на рівні запису: стара вкладка не може повторити період чи ручну операцію. */
export function canAddKpAwards(db: DatabaseSchema, awards: NewKpAward[]): boolean {
  const transactions = db.kpTransactions || [];
  const staged: NewKpAward[] = [];
  for (const award of awards) {
    if (!db.students.some((student) => student.id === award.studentId) ||
        !Number.isInteger(award.amount) || award.amount < 1 || award.amount > 999 || !award.reason.trim()) return false;
    const period = award.weekPeriod;
    if (period) {
      if (!getKpPeriodDates(period) || hasActiveKpOverlap(transactions, award.studentId, period) ||
          staged.some((other) => other.studentId === award.studentId && other.weekPeriod && kpPeriodsOverlap(other.weekPeriod, period))) return false;
    } else if (!award.operationKey || transactions.some((tx) => tx.operationKey === award.operationKey) || staged.some((tx) => tx.operationKey === award.operationKey)) {
      return false;
    }
    staged.push(award);
  }
  return awards.length > 0;
}

/**
 * Розраховує рекомендовану суму KP для учня за тиждень.
 * Відвідуваність враховується лише за уроками, де є записи:
 * уроки без жодного запису не вважаються «100% присутністю».
 */
export function calcRecommendedKp(
  student: Student,
  db: DatabaseSchema,
  monDate: string,
  friDate: string
): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = 0;

  const weekLessons = db.lessons.filter(
    (l) => l.classId === student.classId && l.date >= monDate && l.date <= friDate
  );

  if (weekLessons.length === 0) {
    return { total: 0, breakdown: ['Немає уроків'] };
  }

  // Уроки, де фактично є дані про учня (оцінки / Н / примітки)
  const tracked = weekLessons.filter((l) => db.records[student.id]?.[l.id]);
  const absents = tracked.filter((l) => db.records[student.id]?.[l.id]?.absent).length;

  if (tracked.length > 0) {
    if (absents === 0 && tracked.length === weekLessons.length) {
      total += 5;
      breakdown.push('+5 (100% відвідуваність)');
    } else if (absents === 0) {
      total += 2;
      breakdown.push(`+2 (без зафіксованих пропусків, дані ${tracked.length}/${weekLessons.length})`);
    } else if (absents <= 1) {
      total += 2;
      breakdown.push(`+2 (пропуск: ${absents})`);
    }
  }

  // Середній бал за тиждень
  const allScores: number[] = [];
  for (const l of weekLessons) {
    const entry = db.records[student.id]?.[l.id];
    if (entry && !entry.absent) {
      const scores = Object.values(entry.scores || {});
      if (scores.length > 0) {
        allScores.push(...scores);
      }
    }
  }
  if (allScores.length > 0) {
    const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    if (avg >= 10) {
      total += 5;
      breakdown.push(`+5 (сер. бал: ${avg.toFixed(1)})`);
    } else if (avg >= 7) {
      total += 3;
      breakdown.push(`+3 (сер. бал: ${avg.toFixed(1)})`);
    } else if (avg >= 4) {
      total += 1;
      breakdown.push(`+1 (сер. бал: ${avg.toFixed(1)})`);
    }
  }

  // Фідбек учня
  const feedbackCount = weekLessons.filter(
    (l) => db.lessonFeedback?.[`${student.id}:${l.id}`]
  ).length;
  if (feedbackCount === weekLessons.length && feedbackCount > 0) {
    total += 2;
    breakdown.push('+2 (всі анкети заповнено)');
  }

  // Без активних боргів
  const hasDebts = (db.attentionTasks || []).some(
    (t) => t.studentId === student.id && !t.isCompleted
  );
  if (!hasDebts && total > 0) {
    total += 1;
    breakdown.push('+1 (без боргів)');
  }

  return { total, breakdown };
}
