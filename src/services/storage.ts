import { DatabaseSchema } from '../types/feedback';
import { migrateDatabase, createEmptyDatabase } from './migration';

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
  let rawData: unknown = null;

  try {
    const res = await fetch(url);
    if (res.status === 401) {
      logout();
      throw new Error('Необхідна авторизація');
    }
    if (res.ok) {
      rawData = await res.json();
    }
  } catch (err) {
    console.warn('Неможливо отримати дані з API, спроба з локального кешу:', err);
  }

  // Якщо з API не вдалося, шукаємо у LocalStorage
  if (!rawData && typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const cachedStr = JSON.stringify(parsed);
        if (!cachedStr.includes('Ð') && !cachedStr.includes('Ñ')) {
          rawData = parsed;
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ігноруємо
      }
    }
  }

  // Якщо даних немає взагалі — повертаємо нову порожню базу
  if (!rawData) {
    return createEmptyDatabase();
  }

  // Автоматична міграція структури до актуальної версії
  const migrated = migrateDatabase(rawData);

  // Оновлюємо кеш та, якщо відбулося оновлення версії, зберігаємо на сервері
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  }

  const prevVersion = (rawData as Record<string, any>)?.version;
  if (prevVersion !== migrated.version) {
    saveDatabase(migrated).catch((err) => {
      console.warn('Не вдалося зберегти мігровану версію бази:', err);
    });
  }

  return migrated;
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
