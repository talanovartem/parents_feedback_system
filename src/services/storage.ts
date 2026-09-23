import { DatabaseSchema } from '../types/feedback';
import { migrateDatabase, createEmptyDatabase } from './migration';
import { todayLocalIso } from '../utils/localDate';

const STORAGE_KEY = 'parents_feedback_data_backup';

function getApiUrl(): string {
  // Vite dev-сервер (незалежно від номера порта — 5174 тощо теж працює)
  if (import.meta.env.DEV) {
    return '/api/data';
  }
  // На звичайному PHP хостингу
  return 'api.php';
}

/**
 * Нормалізований вміст бази (JSON без форматування) для порівняння ревізій.
 */
function normalizeDb(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw));
  } catch {
    return raw;
  }
}

/** Остання відома клієнту ревізія бази на сервері ('' — невідома). */
let serverStamp = '';

export function logout(): void {
  if (typeof window !== 'undefined') {
    window.location.href = 'index.php?logout=1';
  }
}

export type SaveStatus = 'saved' | 'offline' | 'conflict';

export async function fetchDatabase(): Promise<DatabaseSchema> {
  const url = getApiUrl();
  let rawData: unknown = null;
  let cacheRaw: string | null = null;

  try {
    const res = await fetch(url);
    if (res.status === 401) {
      logout();
      throw new Error('Необхідна авторизація');
    }
    if (res.ok) {
      const text = await res.text();
      serverStamp = normalizeDb(text);
      try {
        rawData = JSON.parse(text);
      } catch {
        rawData = null;
      }
    }
    // Сервер відповів (навіть помилкою) — НЕ беремо кеш: його ревізія невідома,
    // і подальший POST міг би затерти новіші дані на сервері.
  } catch {
    // Мережева помилка — можна пробувати локальний кеш
    if (typeof window !== 'undefined') {
      cacheRaw = localStorage.getItem(STORAGE_KEY);
      if (cacheRaw) {
        try {
          const parsed = JSON.parse(cacheRaw);
          const cachedStr = JSON.stringify(parsed);
          if (!cachedStr.includes('Ð') && !cachedStr.includes('Ñ')) {
            rawData = parsed;
            // Позначаємо ревізію кешу — якщо на сервері вона інша, POST буде заблоковано
            serverStamp = normalizeDb(cacheRaw);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            cacheRaw = null;
          }
        } catch {
          cacheRaw = null;
        }
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

export async function saveDatabase(data: DatabaseSchema): Promise<SaveStatus> {
  const payload = JSON.stringify(data);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, payload);
  }

  const url = getApiUrl();

  // Перед записом звіряємо ревізію: якщо базу змінили з іншого пристрою — не затираємо
  try {
    const probe = await fetch(url);
    if (probe.ok) {
      const current = normalizeDb(await probe.text());
      if (serverStamp && current !== serverStamp) {
        return 'conflict';
      }
      serverStamp = current;
    }
  } catch {
    // сервер недоступний — нижче спроба POST
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    if (res.status === 401) {
      logout();
      return 'offline';
    }
    if (!res.ok) {
      return 'offline';
    }

    serverStamp = normalizeDb(payload);
    return 'saved';
  } catch (err) {
    console.error('Помилка збереження на сервері:', err);
    return 'offline';
  }
}

export function exportDatabaseToFile(data: DatabaseSchema) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = todayLocalIso();
  a.href = url;
  a.download = `parents_feedback_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
