import { Criterion, DatabaseSchema, Lesson, Student, StudentAnalytics } from '../types/feedback';

export interface LessonScorePoint {
  lessonId: string;
  date: string;
  lessonNumber: number;
  topic?: string;
  absent?: boolean;
  averageScore?: number; // середній бал за урок (0-12)
  scores: Record<string, number>;
  notes?: string;
}

export interface StudentTrendData {
  points: LessonScorePoint[];
  overallAverage: number;
  recentAverage: number;
  previousAverage: number;
  difference: number; // recentAverage - previousAverage
  trendDirection: 'up' | 'down' | 'stable';
  attendedCount: number;
  absentCount: number;
  totalCount: number;
}

/**
 * Розрахунок аналітики учня за вибраний період уроків
 */
export function calculateStudentAnalytics(
  student: Student,
  db: DatabaseSchema,
  filteredLessons?: Lesson[]
): StudentAnalytics {
  const lessons = filteredLessons || db.lessons.filter((l) => l.classId === student.classId);
  const studentRecords = db.records[student.id] || {};

  const scoreTotals: Record<string, { sum: number; count: number }> = {};
  const lessonNotes: StudentAnalytics['lessonNotes'] = [];

  let overallSum = 0;
  let overallCount = 0;
  let absentCount = 0;

  for (const lesson of lessons) {
    const entry = studentRecords[lesson.id];
    if (!entry) continue;

    if (entry.absent) {
      absentCount += 1;
      if (entry.notes && entry.notes.trim()) {
        lessonNotes.push({
          lesson,
          notes: `[Відсутній] ${entry.notes.trim()}`,
          scores: {},
          absent: true,
        });
      } else {
        lessonNotes.push({
          lesson,
          notes: `[Відсутній] Пропуск уроку`,
          scores: {},
          absent: true,
        });
      }
      continue;
    }

    if (entry.notes && entry.notes.trim()) {
      lessonNotes.push({
        lesson,
        notes: entry.notes.trim(),
        scores: entry.scores || {},
        absent: false,
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
    attendedLessonsCount: lessons.length - absentCount,
    absentLessonsCount: absentCount,
    averageScores,
    totalAverage,
    lessonNotes,
  };
}

/**
 * Розрахунок хронологічної динаміки та поурочного тренду учня
 */
export function calculateStudentTrend(
  student: Student,
  db: DatabaseSchema,
  filteredLessons?: Lesson[]
): StudentTrendData {
  const lessons = (filteredLessons || db.lessons.filter((l) => l.classId === student.classId))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.lessonNumber - b.lessonNumber);

  const studentRecords = db.records[student.id] || {};
  const points: LessonScorePoint[] = [];

  let totalSum = 0;
  let totalScoreCount = 0;
  let attendedCount = 0;
  let absentCount = 0;

  for (const lesson of lessons) {
    const entry = studentRecords[lesson.id];
    const isAbsent = Boolean(entry?.absent);
    const scores = entry?.scores || {};
    const notes = entry?.notes;

    if (isAbsent) {
      absentCount += 1;
      points.push({
        lessonId: lesson.id,
        date: lesson.date,
        lessonNumber: lesson.lessonNumber,
        topic: lesson.topic,
        absent: true,
        scores: {},
        notes,
      });
      continue;
    }

    if (entry) {
      attendedCount += 1;
    }

    let lessonSum = 0;
    let lessonCount = 0;

    for (const score of Object.values(scores)) {
      if (typeof score === 'number' && !isNaN(score)) {
        lessonSum += score;
        lessonCount += 1;
        totalSum += score;
        totalScoreCount += 1;
      }
    }

    const lessonAvg = lessonCount > 0 ? Number((lessonSum / lessonCount).toFixed(1)) : undefined;

    points.push({
      lessonId: lesson.id,
      date: lesson.date,
      lessonNumber: lesson.lessonNumber,
      topic: lesson.topic,
      absent: false,
      averageScore: lessonAvg,
      scores,
      notes,
    });
  }

  const overallAverage = totalScoreCount > 0 ? Number((totalSum / totalScoreCount).toFixed(1)) : 0;

  // Порівняння останніх уроків із попередніми
  const pointsWithScores = points.filter((p) => p.averageScore !== undefined);
  let recentAverage = overallAverage;
  let previousAverage = overallAverage;
  let difference = 0;
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';

  if (pointsWithScores.length >= 2) {
    const mid = Math.floor(pointsWithScores.length / 2);
    const prevHalf = pointsWithScores.slice(0, mid);
    const recentHalf = pointsWithScores.slice(mid);

    const prevSum = prevHalf.reduce((acc, p) => acc + (p.averageScore || 0), 0);
    const recentSum = recentHalf.reduce((acc, p) => acc + (p.averageScore || 0), 0);

    previousAverage = Number((prevSum / prevHalf.length).toFixed(1));
    recentAverage = Number((recentSum / recentHalf.length).toFixed(1));

    difference = Number((recentAverage - previousAverage).toFixed(1));

    if (difference >= 0.3) {
      trendDirection = 'up';
    } else if (difference <= -0.3) {
      trendDirection = 'down';
    } else {
      trendDirection = 'stable';
    }
  }

  return {
    points,
    overallAverage,
    recentAverage,
    previousAverage,
    difference,
    trendDirection,
    attendedCount,
    absentCount,
    totalCount: lessons.length,
  };
}

/**
 * Генерація тексту промпту для ШІ для одного учня
 */
export function generateAiPromptForParents(
  analytics: StudentAnalytics,
  criteria: Criterion[],
  className: string,
  periodDescription: string
): string {
  const { student, averageScores, totalAverage, lessonNotes, totalLessons, absentLessonsCount } = analytics;

  const criteriaLines = criteria
    .map((c) => {
      const avg = averageScores[c.id];
      if (avg !== undefined) {
        return `  - ${c.name}: ${avg} / 12 (бал)`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  const notesLines =
    lessonNotes.length > 0
      ? lessonNotes
          .map(
            (n) =>
              `  - Урок ${n.lesson.date} (№${n.lesson.lessonNumber}${
                n.lesson.topic ? ', ' + n.lesson.topic : ''
              }): ${n.notes}`
          )
          .join('\n')
      : '  - Особливих зауважень немає, робота в межах норми.';

  const generalNote = student.notes ? `Загальні індивідуальні особливості: ${student.notes}\n` : '';
  const attendanceNote =
    absentLessonsCount > 0
      ? `- Відвідування: пропущено ${absentLessonsCount} з ${totalLessons} уроків\n`
      : `- Відвідування: 100% присутність на всіх ${totalLessons} уроках\n`;

  return `Дій як доброзичливий, підтримуючий та професійний шкільний вчитель. 
Склади стисле, тепле і конструктивне повідомлення для батьків учня/учениці щодо успіхів за період (${periodDescription}).

Інформація про учня:
- Ім'я: ${student.name}
- Клас: ${className}
${generalNote}${attendanceNote}
Показники активності та діяльності за відвідані уроки (шкала 0-12):
${criteriaLines}
- Загальний середній бал: ${totalAverage} / 12

Поурочні спостереження, відвідування та примітки вчителя:
${notesLines}

Вимоги до повідомлення для батьків:
1. Тон: доброзичливий, партнерський, тактовний та мотивуючий.
2. Спершу відзнач сильні сторони, старання та успіхи дитини на уроках.
3. М'яко та конструктивно вкажи на зони розвитку або моменти, де дитині потрібна підтримка (якщо середні бали нижче 8 або є пропуски уроків чи зауваження).
4. Запропонуй прості рекомендації чи слова підтримки для вдома.
5. Обсяг: 2-3 компактні абзаци, зручні для читання в месенджері (Viber/Telegram). Без надмірної формальності.`;
}

/**
 * Генерація спільного промпту для ШІ для групи учнів (масовий звіт)
 */
export function generateBatchAiPrompt(
  items: Array<{ analytics: StudentAnalytics; className: string }>,
  criteria: Criterion[],
  groupName: string,
  periodDescription: string
): string {
  const studentsSections = items
    .map((item, index) => {
      const { analytics, className } = item;
      const { student, averageScores, totalAverage, lessonNotes, totalLessons, absentLessonsCount } =
        analytics;

      const criteriaSummary = criteria
        .map((c) => {
          const avg = averageScores[c.id];
          return avg !== undefined ? `${c.name}: ${avg}/12` : null;
        })
        .filter(Boolean)
        .join(', ');

      const notesSummary =
        lessonNotes.length > 0
          ? lessonNotes
              .map(
                (n) =>
                  `  * Урок ${n.lesson.date} (${n.lesson.topic || 'Урок'}): ${n.notes}`
              )
              .join('\n')
          : '  * Зауважень немає, стабільна робота';

      const personalNote = student.notes
        ? `Індивідуальні особливості учня (контекст для вчителя, врахуй делікатно): ${student.notes}`
        : '';
      const attendance =
        absentLessonsCount > 0
          ? `Пропущено уроків: ${absentLessonsCount} з ${totalLessons}`
          : '100% відвідування';

      return `---
УЧЕНЬ №${index + 1}: ${student.name} (${className})
- Загальний середній бал: ${totalAverage}/12
- Бали за напрямками: ${criteriaSummary || 'дані відсутні'}
- Відвідування: ${attendance}
${personalNote ? `- ${personalNote}\n` : ''}- Поурочні спостереження та зауваження:
${notesSummary}
`;
    })
    .join('\n');

  return `Дій як професійний, доброзичливий і тактовний шкільний вчитель.
Перед тобою дані успішності групи учнів (${groupName}) за період: ${periodDescription}.

ТВОЄ ЗАВДАННЯ:
Для кожного учня зі списку нижче склади окреме персоналізоване повідомлення для батьків, яке вчитель зможе скопіювати і надіслати у Viber або Telegram.

ВИМОГИ ДО КОЖНОГО ПОВІДОМЛЕННЯ:
1. Звернення та тон: доброзичливий, партнерський, теплий і мотивуючий.
2. Структура:
   - Відзнач позитивні моменти, активність чи старанність дитини на уроках.
   - Якщо середній бал нижче 8, є пропуски або поурочні зауваження — м'яко зверни увагу на ці зони розвитку.
   - Якщо вказані індивідуальні особливості сприйняття дитини, врахуй їх у вигляді делікатних рекомендацій для підтримки вдома.
3. Обсяг: 2-3 компактні абзаци на одного учня, зручні для читання з екрана смартфона.
4. ФОРМАТ ВІДПОВІДІ:
   Обов'язково виділяй повідомлення для кожного учня чітким заголовком та роздільником:

   ## Повідомлення для батьків: [Ім'я учня] ([Клас])
   [Текст повідомлення]
   ---

СПИСОК УЧНІВ ТА ДАНІ:
${studentsSections}
`;
}
