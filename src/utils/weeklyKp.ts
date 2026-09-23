import { DatabaseSchema, Student } from '../types/feedback';
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
export function getWeekPeriod(offset: 0 | -1) {
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
