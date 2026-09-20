import { Criterion, DatabaseSchema, Lesson, Student, StudentAnalytics } from '../types/feedback';

/**
 * Розрахунок аналітики учня за вибраний період уроків
 */
export function calculateStudentAnalytics(
  student: Student,
  db: DatabaseSchema,
  filteredLessons?: Lesson[]
): StudentAnalytics {
  const lessons = filteredLessons || db.lessons.filter(l => l.classId === student.classId);
  const studentRecords = db.records[student.id] || {};

  const scoreTotals: Record<string, { sum: number; count: number }> = {};
  const lessonNotes: Array<{ lesson: Lesson; notes: string; scores: Record<string, number> }> = [];

  let overallSum = 0;
  let overallCount = 0;

  for (const lesson of lessons) {
    const entry = studentRecords[lesson.id];
    if (!entry) continue;

    if (entry.notes && entry.notes.trim()) {
      lessonNotes.push({
        lesson,
        notes: entry.notes.trim(),
        scores: entry.scores || {}
      });
    }

    if (entry.scores) {
      for (const [critId, score] of Object.entries(entry.scores)) {
        if (typeof score === 'number' && !isNaN(score)) {
          if (!scoreTotals[critId]) {
            scoreTotals[critId] = { sum: 0, count: 0 };
          }
          scoreTotals[critId].sum += score;
          scoreTotals[critId].count += 1;

          overallSum += score;
          overallCount += 1;
        }
      }
    }
  }

  const averageScores: Record<string, number> = {};
  for (const [critId, data] of Object.entries(scoreTotals)) {
    averageScores[critId] = data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0;
  }

  const totalAverage = overallCount > 0 ? Number((overallSum / overallCount).toFixed(1)) : 0;

  return {
    student,
    totalLessons: lessons.length,
    averageScores,
    totalAverage,
    lessonNotes
  };
}

/**
 * Генерація тексту промпту для ШІ або готового звіту для батьків
 */
export function generateAiPromptForParents(
  analytics: StudentAnalytics,
  criteria: Criterion[],
  className: string,
  periodDescription: string
): string {
  const { student, averageScores, totalAverage, lessonNotes } = analytics;

  const criteriaLines = criteria
    .map(c => {
      const avg = averageScores[c.id];
      if (avg !== undefined) {
        return `  - ${c.name}: ${avg} / 12 (бал)`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  const notesLines = lessonNotes.length > 0
    ? lessonNotes
        .map(n => `  - Урок ${n.lesson.date} (№${n.lesson.lessonNumber}${n.lesson.topic ? ', ' + n.lesson.topic : ''}): "${n.notes}"`)
        .join('\n')
    : '  - Особливих зауважень немає, робота в межах норми.';

  const generalNote = student.notes ? `Загальні індивідуальні особливості: ${student.notes}\n` : '';

  return `Дій як доброзичливий, підтримуючий та професійний шкільний вчитель. 
Склади стисле, тепле і конструктивне повідомлення для батьків учня/учениці щодо успіхів за період (${periodDescription}).

Інформація про учня:
- Ім'я: ${student.name}
- Клас: ${className}
${generalNote}
Показники активності та діяльності за уроки (шкала 0-12):
${criteriaLines}
- Загальний середній бал: ${totalAverage} / 12

Поурочні спостереження та примітки вчителя:
${notesLines}

Вимоги до повідомлення для батьків:
1. Тон: доброзичливий, партнерський, тактовний та мотивуючий.
2. Спершу відзнач сильні сторони, старання та успіхи дитини на уроках.
3. М'яко та конструктивно вкажи на зони розвитку або моменти, де дитині потрібна підтримка (якщо середні бали нижче 8 або в коментарях є зауваження).
4. Запропонуй прості рекомендації чи слова підтримки для вдома.
5. Обсяг: 2-3 компактні абзаци, зручні для читання в месенджері (Viber/Telegram). Без надмірної формальності.`;
}
