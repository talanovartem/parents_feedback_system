import { DatabaseSchema, StudentLessonFeedback } from '../types/feedback';
import { fetchDatabase, inspectServerDatabase, saveDatabase } from './storage';
import { applyFeedbackToDb } from '../utils/feedbackStore';

/**
 * Публічний вхід (portal.php на хостингу або ?public=1 у dev) —
 * SPA відкривається без пароля вчителя, але БД не вантажиться повністю:
 * дані віддаються API лише після перевірки коду доступу / PIN.
 */
export function isPublicEntry(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname, search } = window.location;
  return pathname.endsWith('portal.php') || new URLSearchParams(search).has('public');
}

/** Vite dev-сервер (незалежно від номера порта). */
export function isDevApi(): boolean {
  return import.meta.env.DEV;
}

/** Абсолютне посилання на публічну сторінку (портал / фідбек) для роздачі учням. */
export function getPublicEntryUrl(hash: string): string {
  if (typeof window === 'undefined') return hash;
  const normalized = hash.startsWith('#') ? hash : `#${hash}`;
  const { origin, pathname } = window.location;
  if (isDevApi()) {
    return `${origin}/?public=1${normalized}`;
  }
  const dir = pathname.replace(/[^/]*$/, ''); // '/index.php' → '/', '/journal/index.php' → '/journal/'
  return `${origin}${dir}portal.php${normalized}`;
}

function errorFrom(res: Response, fallback: string): Promise<never> {
  return res
    .json()
    .catch(() => ({ error: fallback }))
    .then((body: { error?: string }) => {
      throw new Error(body.error || fallback);
    });
}

/** Вхід учня за 6-значним кодом. Повертає обмежену базу лише цього учня. */
export async function portalLogin(studentId: string, code: string): Promise<DatabaseSchema> {
  if (isDevApi()) {
    const full = await fetchDatabase();
    const s = full.students.find((x) => x.id === studentId);
    if (!s || s.accessCode !== code) {
      throw new Error('Невірний код доступу');
    }
    return full;
  }
  const res = await fetch('api.php?action=portal_auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, code }),
  });
  if (!res.ok) return errorFrom(res, 'Невірний код доступу');
  return res.json();
}

/** Метадані для сторінки фідбеку (урок, клас, учні без PIN). null — урок не знайдено. */
export async function fetchFeedbackMeta(lessonId: string): Promise<DatabaseSchema | null> {
  if (isDevApi()) {
    const full = await fetchDatabase();
    return full.lessons.some((l) => l.id === lessonId) ? full : null;
  }
  const res = await fetch(`api.php?action=feedback_meta&lessonId=${encodeURIComponent(lessonId)}`);
  if (res.status === 404) return null;
  if (!res.ok) return errorFrom(res, 'Не вдалося завантажити урок');
  return res.json();
}

/** Серверна перевірка PIN у публічному режимі. */
export async function verifyFeedbackPin(studentId: string, pin: string): Promise<void> {
  if (isDevApi()) {
    const full = await fetchDatabase();
    const s = full.students.find((x) => x.id === studentId);
    if (!s) throw new Error('Учня не знайдено');
    if (s.pinCode && s.pinCode !== pin.trim()) throw new Error('Невірний PIN-код');
    return;
  }
  const res = await fetch('api.php?action=feedback_auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, pin }),
  });
  if (!res.ok) return errorFrom(res, 'Невірний PIN-код');
}

export interface PublicFeedbackResult {
  earned: number;
  balance: number;
}

/** Поточні відповіді до уроку для вчителя. Публічний API не віддає їх без авторизації. */
export async function fetchLessonFeedback(lessonId: string): Promise<StudentLessonFeedback[]> {
  if (isDevApi()) {
    const { data } = await inspectServerDatabase();
    return Object.values(data.lessonFeedback || {}).filter((feedback) => feedback.lessonId === lessonId);
  }
  const res = await fetch(`api.php?action=feedback_status&lessonId=${encodeURIComponent(lessonId)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return errorFrom(res, 'Не вдалося оновити відповіді учнів');
  const body: { feedback: StudentLessonFeedback[] } = await res.json();
  return body.feedback;
}

/** Збереження фідбеку через API (бонус рахує сервер). Повертає зароблені бали та новий баланс. */
export async function savePublicFeedback(
  lessonId: string,
  studentId: string,
  pin: string,
  feedback: StudentLessonFeedback
): Promise<PublicFeedbackResult> {
  if (isDevApi()) {
    const full = await fetchDatabase();
    const updated = applyFeedbackToDb(full, { ...feedback, id: `${studentId}:${lessonId}` });
    const status = await saveDatabase(updated);
    if (status !== 'saved') throw new Error('Не вдалося зберегти відгук. Оновіть сторінку й спробуйте ще раз.');
    const balance = updated.students.find((s) => s.id === studentId)?.karpatyPoints || 0;
    return { earned: feedback.karpatyPointsEarned || 0, balance };
  }
  const res = await fetch('api.php?action=save_feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, studentId, pin, feedback }),
  });
  if (!res.ok) return errorFrom(res, 'Не вдалося зберегти відгук');
  const body = await res.json();
  return { earned: body.karpatyPointsEarned ?? 0, balance: body.balance ?? 0 };
}
