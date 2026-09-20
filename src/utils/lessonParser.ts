import { ClassItem, Lesson } from '../types/feedback';

export interface ParsedLessonItem {
  id: string; // тимчасовий ідентифікатор для списку передперегляду
  selected: boolean;
  date: string; // YYYY-MM-DD
  classId: string;
  lessonNumber: number;
  topic: string;
  isDuplicate: boolean;
  originalLine: string;
}


/**
 * Знаходження класу в рядку тексту
 */
function detectClass(line: string, classes: ClassItem[], defaultClassId: string): { classId: string; matchedText?: string } {
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

      const pattern = new RegExp(`(?<![а-яА-Яa-zA-Z0-9])${numPart}\\s*[-_–—]?\\s*([${altLetters}])(?![а-яА-Яa-zA-Z0-9])`, 'u');
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
  const dmyMatch = line.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])(?:[-/.](20\d{2}|\d{2}))?\b/);
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
    // Ігноруємо коментарі або заголовки таблиць Excel
    if (line.startsWith('#') || line.startsWith('//')) return;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('дата') && lowerLine.includes('тема')) return;

    let workingLine = line;

    // 1. Якщо це розділені табуляцією або пайпом колонки: Дата | Клас | Номер | Тема
    const delims = ['\t', '|', ';'];
    let parts: string[] | null = null;
    for (const d of delims) {
      if (line.includes(d)) {
        parts = line.split(d).map((p) => p.trim());
        break;
      }
    }

    let detectedClassId = defaultClassId;
    let detectedDateIso = new Date().toISOString().slice(0, 10);
    let detectedNumber = 1;
    let topic = '';

    if (parts && parts.length >= 2) {
      // Спроба розбору колонок
      for (const part of parts) {
        if (!part) continue;

        // Перевіряємо, чи це дата
        const dateRes = detectDate(part);
        if (dateRes.matchedText && (dateRes.matchedText === part || part.length <= 10)) {
          detectedDateIso = dateRes.dateIso;
          continue;
        }

        // Перевіряємо, чи це клас
        const classRes = detectClass(part, classes, '');
        if (classRes.classId) {
          detectedClassId = classRes.classId;
          continue;
        }

        // Перевіряємо, чи це просто номер (1-10)
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
    } else {
      // Довільний текст
      // Розпізнаємо клас
      const classRes = detectClass(workingLine, classes, defaultClassId);
      detectedClassId = classRes.classId;
      if (classRes.matchedText) {
        workingLine = workingLine.replace(classRes.matchedText, ' ');
      }

      // Розпізнаємо дату
      const dateRes = detectDate(workingLine);
      detectedDateIso = dateRes.dateIso;
      if (dateRes.matchedText) {
        workingLine = workingLine.replace(dateRes.matchedText, ' ');
      }

      // Розпізнаємо номер уроку
      const numRes = detectLessonNumber(workingLine);
      detectedNumber = numRes.lessonNumber;
      if (numRes.matchedText) {
        workingLine = workingLine.replace(numRes.matchedText, ' ');
      }

      // Очищаємо залишок як тему
      topic = workingLine
        .replace(/^[\s\d\-–—.:;|,()[\]]+/, '') // прибираємо початкові номери рядків або роздільники
        .replace(/^[-\s:–—|]+/, '')
        .replace(/[-\s:–—|]+$/, '')
        .trim();
    }

    // Автоматичне збільшення номера для кількох уроків в один день одного класу, якщо номер не було вказано явно
    if (!classLessonDateCounts[detectedClassId]) {
      classLessonDateCounts[detectedClassId] = {};
    }
    const currentCount = classLessonDateCounts[detectedClassId][detectedDateIso] || 0;
    if (detectedNumber === 1 && currentCount > 0) {
      detectedNumber = currentCount + 1;
    }
    classLessonDateCounts[detectedClassId][detectedDateIso] = Math.max(currentCount + 1, detectedNumber);

    // Перевірка на дублікат у наявних уроках
    const isDuplicate = existingLessons.some(
      (ex) => ex.classId === detectedClassId && ex.date === detectedDateIso && ex.lessonNumber === detectedNumber
    );

    results.push({
      id: `temp-${index}-${Date.now()}`,
      selected: !isDuplicate, // якщо дублікат — за замовчуванням знімаємо виділення
      date: detectedDateIso,
      classId: detectedClassId,
      lessonNumber: detectedNumber,
      topic: topic || 'Урок',
      isDuplicate,
      originalLine: line,
    });
  });

  return results;
}
