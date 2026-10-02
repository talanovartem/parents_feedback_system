import { Student, SavedReport } from '../types/feedback';

export interface ParsedStudentReport {
  studentId: string;
  studentName: string;
  content: string;
}

export interface ParseBatchResult {
  matched: ParsedStudentReport[];
  unmatched: Array<{ header: string; content: string }>;
}

/**
 * Витягує блоки з відповіді ШІ, розділені форматними маркерами.
 *
 * Підтримує формати:
 * - "=== ЗВІТ ДЛЯ: [Ім'я] ===" / "=== КІНЕЦЬ ЗВІТУ ==="
 * - "## Повідомлення для батьків: [Ім'я] ([Клас])"
 * - "## [Ім'я]:"
 */
function extractBlocks(rawText: string): Array<{ header: string; content: string }> {
  const blocks: Array<{ header: string; content: string }> = [];

  // Формат 1: === ЗВІТ ДЛЯ: ... === ... === КІНЕЦЬ ЗВІТУ ===
  const format1 = /===\s*ЗВІТ ДЛЯ:\s*([^\n=]+?)\s*===\s*([\s\S]*?)(?====\s*(?:КІНЕЦЬ ЗВІТУ|ЗВІТ ДЛЯ))/gi;
  let m: RegExpExecArray | null;
  let usedFormat1 = false;
  while ((m = format1.exec(rawText)) !== null) {
    blocks.push({ header: m[1].trim(), content: m[2].trim() });
    usedFormat1 = true;
  }
  if (usedFormat1) return blocks;

  // Формат 2: ## Повідомлення для батьків: Ім'я (Клас) або ## Ім'я (Клас):
  const lines = rawText.split('\n');
  const headerPattern = /^#{1,3}\s+(?:Повідомлення для батьків:?\s*)?(.+?)(?:\s*\([^)]*\))?\s*(?:---)?$/i;

  let currentHeader = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(headerPattern);
    if (headerMatch && line.trimStart().startsWith('#')) {
      // Зберігаємо попередній блок
      if (currentHeader && currentLines.length > 0) {
        const content = currentLines.join('\n').replace(/^---+\s*/m, '').replace(/\s*---+$/m, '').trim();
        if (content) blocks.push({ header: currentHeader, content });
      }
      currentHeader = headerMatch[1].trim();
      currentLines = [];
    } else if (currentHeader) {
      currentLines.push(line);
    }
  }
  // Залишковий блок
  if (currentHeader && currentLines.length > 0) {
    const content = currentLines.join('\n').replace(/^---+\s*/m, '').replace(/\s*---+$/m, '').trim();
    if (content) blocks.push({ header: currentHeader, content });
  }

  return blocks;
}

/**
 * Розраховує відстань Левенштейна між двома рядками (для нечіткого пошуку).
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Знаходить найкращого кандидата-учня за заголовком блоку.
 * Повертає studentId або null якщо нічого не знайдено з прийнятною схожістю.
 */
function findBestStudent(header: string, students: Student[]): Student | null {
  const headerLower = header.toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();

  const exact = students.filter((s) => headerLower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(headerLower));
  if (exact.length > 0) return exact.length === 1 ? exact[0] : null;

  // Нечітке: знаходимо учня з найменшою відстанню Левенштейна
  let best: Student | null = null;
  let bestDist = Infinity;
  let ambiguous = false;
  for (const s of students) {
    const dist = levenshtein(headerLower, s.name.toLowerCase());
    // Невеликі описки можна виправити; менш певні збіги вчитель призначає вручну.
    const threshold = Math.floor(Math.max(headerLower.length, s.name.length) * 0.2);
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      best = s;
      ambiguous = false;
    } else if (dist === bestDist) {
      ambiguous = true;
    }
  }
  return ambiguous ? null : best;
}

/**
 * Парсить сиру відповідь ШІ та зіставляє блоки тексту з учнями зі списку.
 */
export function parseBatchAiResponse(rawText: string, students: Student[]): ParseBatchResult {
  const blocks = extractBlocks(rawText);
  const matched: ParsedStudentReport[] = [];
  const unmatched: ParseBatchResult['unmatched'] = [];
  const matchedIds = new Set<string>();

  for (const block of blocks) {
    const student = findBestStudent(block.header, students);
    if (student && !matchedIds.has(student.id)) {
      matchedIds.add(student.id);
      matched.push({
        studentId: student.id,
        studentName: student.name,
        content: block.content,
      });
    } else {
      unmatched.push(block);
    }
  }

  return { matched, unmatched };
}

/**
 * Будує об'єкт SavedReport з розпізнаного блоку.
 */
export function buildSavedReport(
  studentId: string,
  period: string,
  content: string
): SavedReport {
  const id = `${studentId}:${period}`;
  return {
    id,
    studentId,
    period,
    content,
    updatedAt: new Date().toISOString(),
  };
}
