import { DatabaseSchema } from '../types/feedback';

const STORAGE_KEY = 'parents_feedback_data_backup';

export async function fetchDatabase(): Promise<DatabaseSchema> {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const data = await res.json();
      // Зберігаємо локальну резервну копію
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Неможливо отримати дані з /api/data, спроба з локального кешу:', err);
  }

  // Fallback до LocalStorage
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Якщо в кеші немає кракозябр (символів подвійного кодування UTF-8)
      const cachedStr = JSON.stringify(parsed);
      if (!cachedStr.includes('Ð') && !cachedStr.includes('Ñ')) {
        return parsed;
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ігноруємо
    }
  }

  // Дефолтна структура
  return {
    classes: [
      { id: 'cls-6a', name: '6-А' },
      { id: 'cls-6b', name: '6-Б' }
    ],
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
  // Завжди оновлюємо браузерний бекап
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
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
