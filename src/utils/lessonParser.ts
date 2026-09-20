import { ClassItem, Lesson } from '../types/feedback';

export interface ParsedLessonItem {
  id: string; // тимчасовий ідентифікатор для списку передперегляду
  selected: boolean;
  date: string; // YYYY-MM-DD
  classId: string;
  lessonNumber: number;
  time?: string; // наприклад, "14:20 - 14:55"
  topic: string;
  isDuplicate: boolean;
  originalLine: string;
}

/**
 * Генерує посилання на розклад School Today для поточного або зміщеного тижня
 */
export function getSchoolTodayUrl(offsetWeeks = 0): {
  url: string;
  startDateStr: string;
  endDateStr: string;
  startDateIso: string;
  endDateIso: string;
} {
  const now = new Date();
  // Зміщення на offsetWeeks тижнів
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetWeeks * 7);

  const day = current.getDay(); // 0 - неділя, 1 - понеділок...
  const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.getFullYear(), current.getMonth(), diffToMonday);

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  const formatHuman = (d: Date) => {
    const dayStr = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${dayStr}.${m}`;
  };

  const startDateIso = formatIso(monday);
  const endDateIso = formatIso(sunday);

  const url = `https://school-today.com/ClassDetail/TeacherTimetableInfo?TeacherID=1005&DisciplineID=d2037&StartDate=${startDateIso}&__Invariant=StartDate&EndDate=${endDateIso}&__Invariant=EndDate`;

  return {
    url,
    startDateStr: formatHuman(monday),
    endDateStr: formatHuman(sunday),
    startDateIso,
    endDateIso,
  };
}

/**
 * Знаходження класу в рядку тексту (підтримка 8A -> 8-А, 8B -> 8-В тощо)
 */
function detectClass(
  line: string,
  classes: ClassItem[],
  defaultClassId: string
): { classId: string; matchedText?: string } {
  for (const c of classes) {
    const numMatch = c.name.match(/\d+/);
    if (!numMatch) continue;
    const numPart = numMatch[0];
    const letterPart = c.name.replace(/[\d\s-_–—]/g, '');

    if (numPart && letterPart) {
      let altLetters = letterPart;
      if (letterPart.toUpperCase() === 'А') altLetters += 'AaАа';
      if (letterPart.toUpperCase() === 'В') altLetters += 'BbVvВв';
      if (letterPart.toUpperCase() === 'Б') altLetters += 'Бб';

      const pattern = new RegExp(
        `(?<![а-яА-Яa-zA-Z0-9])${numPart}\\s*[-_–—]?\\s*([${altLetters}])(?![а-яА-Яa-zA-Z0-9])`,
        'u'
      );
      const m = line.match(pattern);
      if (m) {
        return { classId: c.id, matchedText: m[0] };
      }
    }
  }

  return { classId: defaultClassId };
}

/**
 * Розпізнавання дати у рядку (YYYY-MM-DD, DD.MM.YYYY, DD.MM тощо)
 */
function detectDate(line: string, currentYear = 2026): { dateIso: string; matchedText?: string } {
  // Формат YYYY-MM-DD або YYYY.MM.DD
  const isoMatch = line.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return { dateIso: `${year}-${month}-${day}`, matchedText: isoMatch[0] };
  }

  // Формат DD.MM.YYYY або DD/MM/YYYY
  const dmyMatch = line.match(
    /\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])(?:[-/.](20\d{2}|\d{2}))?\b/
  );
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = currentYear.toString();
    if (dmyMatch[3]) {
      year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    }
    return { dateIso: `${year}-${month}-${day}`, matchedText: dmyMatch[0] };
  }

  // Якщо дати немає — беремо сьогоднішню дату
  const todayIso = new Date().toISOString().slice(0, 10);
  return { dateIso: todayIso };
}

/**
 * Розпізнавання діапазону часу уроку (наприклад: 14:20 - 14:55)
 */
function detectTime(line: string): { time?: string; matchedText?: string } {
  const m = line.match(/\b(\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2})\b/);
  if (m) {
    return { time: m[1].replace(/\s+/g, ' '), matchedText: m[0] };
  }
  return {};
}

/**
 * Розпізнавання номера уроку (№1, урок 2 тощо)
 */
function detectLessonNumber(line: string): { lessonNumber: number; matchedText?: string } {
  const numMatch = line.match(/(?:№|урок|зан|зан\.|lesson)\s*(\d{1,2})\b/i);
  if (numMatch) {
    return { lessonNumber: parseInt(numMatch[1], 10), matchedText: numMatch[0] };
  }

  return { lessonNumber: 1 };
}

/**
 * Головна функція парсингу тексту в список уроків
 */
export function parseLessonsInput(
  rawText: string,
  classes: ClassItem[],
  defaultClassId: string,
  existingLessons: Lesson[] = []
): ParsedLessonItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedLessonItem[] = [];
  const classLessonDateCounts: Record<string, Record<string, number>> = {};

  lines.forEach((line, index) => {
    // Ігноруємо назви систем, коментарі або заголовки таблиць
    if (line.startsWith('#') || line.startsWith('//')) return;
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes('school today') ||
      lowerLine.includes('школа') ||
      (lowerLine.includes('дата') && (lowerLine.includes('час') || lowerLine.includes('предмет') || lowerLine.includes('тема')))
    ) {
      return;
    }

    let workingLine = line;

    // Перевіряємо роздільники колонок (табуляція, пайп, крапка з комою)
    const delims = ['\t', '|', ';'];
    let parts: string[] | null = null;
    let usedDelim = '';
    for (const d of delims) {
      if (line.includes(d)) {
        parts = line.split(d).map((p) => p.trim());
        usedDelim = d;
        break;
      }
    }

    let detectedClassId = defaultClassId;
    let detectedDateIso = new Date().toISOString().slice(0, 10);
    let detectedNumber = 1;
    let detectedTimeStr: string | undefined = undefined;
    let topic = '';

    // СПЕЦІАЛЬНИЙ РЕЖИМ: Формат School Today (Дата, Час, Предмет, Клас, Тема, [інші колонки обрізаються])
    if (parts && parts.length >= 4 && usedDelim === '\t') {
      const col0Date = detectDate(parts[0]);
      const col1Time = detectTime(parts[1]);

      if (col0Date.matchedText && col1Time.time) {
        detectedDateIso = col0Date.dateIso;
        detectedTimeStr = col1Time.time;

        const subject = parts[2] || '';
        const classCol = parts[3] || '';
        const rawTopic = parts[4] || '';

        // Клас з 4-ї колонки (індекс 3)
        const classRes = detectClass(classCol, classes, defaultClassId);
        detectedClassId = classRes.classId;

        // Тема уроку з 5-ї колонки (індекс 4). Якщо порожня — беремо предмет, якщо і його немає — 'Урок'
        topic = rawTopic.trim() || subject.trim() || 'Урок';

        // Усі наступні колонки (Нотатки, Відвідування, Файли, Домашнє завдання) ПОВНІСТЮ ОБРІЗАЮТЬСЯ
      }
    }

    // Якщо це інший табличний формат (наприклад: 01.09.2026 | 6-А | 1 | Тема)
    if (!topic && parts && parts.length >= 2) {
      for (const part of parts) {
        if (!part) continue;

        // Перевіряємо, чи це дата
        const dateRes = detectDate(part);
        if (dateRes.matchedText && (dateRes.matchedText === part || part.length <= 10)) {
          detectedDateIso = dateRes.dateIso;
          continue;
        }

        // Перевіряємо, чи це час
        const timeRes = detectTime(part);
        if (timeRes.time) {
          detectedTimeStr = timeRes.time;
          continue;
        }

        // Перевіряємо, чи це клас
        const classRes = detectClass(part, classes, '');
        if (classRes.classId) {
          detectedClassId = classRes.classId;
          continue;
        }

        // Перевіряємо, чи це номер уроку (1-10)
        if (/^\d{1,2}$/.test(part)) {
          const n = parseInt(part, 10);
          if (n >= 1 && n <= 10) {
            detectedNumber = n;
            continue;
          }
        }

        // Інакше це тема
        if (!topic) {
          topic = part;
        } else {
          topic += ` - ${part}`;
        }
      }
    } else if (!topic) {
      // Довільний суцільний текст без роздільників
      const timeRes = detectTime(workingLine);
      if (timeRes.time) {
        detectedTimeStr = timeRes.time;
        if (timeRes.matchedText) {
          workingLine = workingLine.replace(timeRes.matchedText, ' ');
        }
      }

      const classRes = detectClass(workingLine, classes, defaultClassId);
      detectedClassId = classRes.classId;
      if (classRes.matchedText) {
        workingLine = workingLine.replace(classRes.matchedText, ' ');
      }

      const dateRes = detectDate(workingLine);
      detectedDateIso = dateRes.dateIso;
      if (dateRes.matchedText) {
        workingLine = workingLine.replace(dateRes.matchedText, ' ');
      }

      const numRes = detectLessonNumber(workingLine);
      detectedNumber = numRes.lessonNumber;
      if (numRes.matchedText) {
        workingLine = workingLine.replace(numRes.matchedText, ' ');
      }

      topic = workingLine
        .replace(/^[\s\d\-–—.:;|,()[\]]+/, '')
        .replace(/^[-\s:–—|]+/, '')
        .replace(/[-\s:–—|]+$/, '')
        .trim();
    }

    // Автоматична послідовність номерів уроків (якщо у дітей 2 уроки підряд в один день)
    if (!classLessonDateCounts[detectedClassId]) {
      classLessonDateCounts[detectedClassId] = {};
    }
    const currentCount = classLessonDateCounts[detectedClassId][detectedDateIso] || 0;
    if (detectedNumber === 1 && currentCount > 0) {
      detectedNumber = currentCount + 1;
    } else if (currentCount > 0 && detectedNumber <= currentCount) {
      detectedNumber = currentCount + 1;
    }
    classLessonDateCounts[detectedClassId][detectedDateIso] = Math.max(currentCount + 1, detectedNumber);

    // Перевірка на дублікат у наявних уроках
    const isDuplicate = existingLessons.some((ex) => {
      if (ex.classId !== detectedClassId || ex.date !== detectedDateIso) return false;
      if (ex.time && detectedTimeStr) {
        return ex.time === detectedTimeStr;
      }
      return ex.lessonNumber === detectedNumber;
    });

    results.push({
      id: `temp-${index}-${Date.now()}`,
      selected: !isDuplicate,
      date: detectedDateIso,
      classId: detectedClassId,
      lessonNumber: detectedNumber,
      time: detectedTimeStr,
      topic: topic || 'Урок',
      isDuplicate,
      originalLine: line,
    });
  });

  return results;
}
