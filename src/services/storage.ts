import { DatabaseSchema } from '../types/feedback';

const STORAGE_KEY = 'parents_feedback_data_backup';

function getApiUrl(): string {
  // Якщо запущено через Vite dev сервер
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return '/api/data';
  }
  // На звичайному PHP хостингу
  return 'api.php';
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    window.location.href = 'index.php?logout=1';
  }
}

export async function fetchDatabase(): Promise<DatabaseSchema> {
  const url = getApiUrl();
  try {
    const res = await fetch(url);
    if (res.status === 401) {
      logout();
      throw new Error('Необхідна авторизація');
    }
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Неможливо отримати дані з API, спроба з локального кешу:', err);
  }

  // Fallback до LocalStorage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const cachedStr = JSON.stringify(parsed);
        if (!cachedStr.includes('Ð') && !cachedStr.includes('Ñ')) {
          return parsed;
        }
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ігноруємо
      }
    }
  }

  // Початкова дефолтна структура
  return {
    classes: [],
    students: [],
    criteria: [
      { id: 'behavior', name: 'Поведінка' },
      { id: 'condition', name: 'Стан дитини' },
      { id: 'efficiency', name: 'Працездатність' },
      { id: 'activity', name: 'Активність' },
      { id: 'progress', name: 'Покращення' },
      { id: 'grade', name: 'Оцінка за урок' }
    ],
    lessons: [],
    records: {}
  };
}

export async function saveDatabase(data: DatabaseSchema): Promise<boolean> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  const url = getApiUrl();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (res.status === 401) {
      logout();
      return false;
    }

    return res.ok;
  } catch (err) {
    console.error('Помилка збереження на сервері:', err);
    return false;
  }
}

export function exportDatabaseToFile(data: DatabaseSchema) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `parents_feedback_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
