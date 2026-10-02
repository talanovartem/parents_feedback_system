import { DatabaseSchema } from '../types/feedback';
import { migrateDatabase, createEmptyDatabase } from './migration';
import { todayLocalIso } from '../utils/localDate';
import { mergeDatabase } from '../utils/mergeDatabase';

const STORAGE_KEY = 'parents_feedback_data_backup';
const PENDING_KEY = 'parents_feedback_pending_save';
const PENDING_STAMP_KEY = 'parents_feedback_pending_revision';
const PENDING_BASE_KEY = 'parents_feedback_pending_base';

function getApiUrl(): string {
  // Vite dev-сервер (незалежно від номера порта — 5174 тощо теж працює)
  if (import.meta.env.DEV) {
    return '/api/data';
  }
  // На звичайному PHP хостингу
  return 'api.php';
}

/** ETag останньої прочитаної або успішно записаної бази. */
let serverStamp = '';
let saveQueue: Promise<SaveStatus> = Promise.resolve('saved');
let lastSaveError = '';
let persistedData: DatabaseSchema | null = null;
let lastQueuedData: DatabaseSchema | null = null;

/** Остання підтверджена сервером версія, включно з об'єднаними змінами. */
export function getSavedDatabase(): DatabaseSchema | null {
  return persistedData;
}

export function hasServerRevision(): boolean {
  return !!serverStamp;
}

export function getLastSaveError(): string {
  return lastSaveError;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    window.location.href = 'index.php?logout=1';
  }
}

export type SaveStatus = 'saved' | 'offline' | 'conflict' | 'unauthorized' | 'server-error';

export interface ServerSnapshot {
  data: DatabaseSchema;
  stamp: string;
}

/** Читає поточний стан сервера без зміни локальних правок та базової ревізії. */
export async function inspectServerDatabase(): Promise<ServerSnapshot> {
  const response = await fetch(getApiUrl(), { cache: 'no-store' });
  if (response.status === 401) {
    logout();
    throw new Error('Необхідна авторизація');
  }
  if (!response.ok) throw new Error(`Сервер повернув HTTP ${response.status}`);
  const stamp = response.headers.get('ETag');
  if (!stamp) throw new Error('Сервер не повернув ревізію бази даних');
  return { data: migrateDatabase(JSON.parse(await response.text())), stamp };
}

/** Викликати після того, як учитель вирішив перейти на переглянуту серверну версію. */
export function acceptServerDatabase(snapshot: ServerSnapshot): void {
  serverStamp = snapshot.stamp;
  persistedData = snapshot.data;
  lastQueuedData = snapshot.data;
  saveQueue = Promise.resolve('saved');
  lastSaveError = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.data));
  localStorage.removeItem(PENDING_KEY);
  localStorage.removeItem(PENDING_STAMP_KEY);
  localStorage.removeItem(PENDING_BASE_KEY);
}

export function getPendingDatabase(): DatabaseSchema | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? migrateDatabase(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function fetchDatabase(): Promise<DatabaseSchema> {
  const url = getApiUrl();
  let rawData: unknown = null;
  let response: Response | null = null;
  try {
    response = await fetch(url);
  } catch {
    // Кеш дозволений лише коли запит не дістався сервера.
    serverStamp = '';
    if (typeof window !== 'undefined') {
      const cacheRaw = localStorage.getItem(STORAGE_KEY);
      if (cacheRaw) {
        try {
          rawData = JSON.parse(cacheRaw);
        } catch {
          rawData = null;
        }
      }
    }
  }

  if (response) {
    if (response.status === 401) {
      logout();
      throw new Error('Необхідна авторизація');
    }
    if (!response.ok) throw new Error(`Не вдалося завантажити базу: HTTP ${response.status}`);
    const text = await response.text();
    rawData = JSON.parse(text);
    serverStamp = response.headers.get('ETag') || '';
    if (!serverStamp) throw new Error('Сервер не повернув ревізію бази даних');
  }

  // Якщо даних немає взагалі — повертаємо нову порожню базу
  if (!rawData) {
    return createEmptyDatabase();
  }

  // Автоматична міграція структури до актуальної версії
  const migrated = migrateDatabase(rawData);
  if (response) {
    persistedData = migrated;
    lastQueuedData = migrated;
  }

  // Оновлюємо кеш та, якщо відбулося оновлення версії, зберігаємо на сервері
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      if (response && localStorage.getItem(PENDING_KEY) === JSON.stringify(migrated)) {
        localStorage.removeItem(PENDING_KEY);
        localStorage.removeItem(PENDING_STAMP_KEY);
        localStorage.removeItem(PENDING_BASE_KEY);
      }
    } catch (error) {
      console.warn('Не вдалося оновити локальну копію бази:', error);
    }
  }

  const prevVersion = (rawData as Record<string, any>)?.version;
  if (prevVersion !== migrated.version) {
    const status = await saveDatabase(migrated);
    if (status !== 'saved') console.warn('Не вдалося зберегти мігровану версію бази:', status);
  }

  return migrated;
}

export function saveDatabase(data: DatabaseSchema): Promise<SaveStatus> {
  const payload = JSON.stringify(data);
  const baseData = lastQueuedData ?? persistedData;
  lastQueuedData = data;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      if (!localStorage.getItem(PENDING_KEY)) {
        localStorage.setItem(PENDING_STAMP_KEY, serverStamp);
        if (baseData) localStorage.setItem(PENDING_BASE_KEY, JSON.stringify(baseData));
      }
      localStorage.setItem(PENDING_KEY, payload);
    } catch (error) {
      console.warn('Не вдалося зберегти локальну копію бази:', error);
    }
  }

  const write = async (): Promise<SaveStatus> => {
    if (!serverStamp || !baseData || !persistedData) return 'offline';
    try {
      lastSaveError = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        let merged: DatabaseSchema;
        try {
          merged = mergeDatabase(baseData, data, persistedData);
        } catch {
          return 'conflict';
        }
        const res = await fetch(getApiUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'If-Match': serverStamp,
          },
          body: JSON.stringify(merged),
        });
      if (res.status === 401) {
        logout();
        return 'unauthorized';
      }
      if (res.status === 409) {
        let snapshot: ServerSnapshot;
        try {
          snapshot = await inspectServerDatabase();
        } catch {
          return 'conflict';
        }
        if (snapshot.stamp === serverStamp) return 'conflict';
        persistedData = snapshot.data;
        serverStamp = snapshot.stamp;
        continue;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        lastSaveError = body?.error || `Сервер повернув HTTP ${res.status}`;
        return 'server-error';
      }
      const nextStamp = res.headers.get('ETag');
      if (!nextStamp) {
        lastSaveError = 'Сервер не підтвердив нову ревізію бази даних';
        return 'server-error';
      }
      serverStamp = nextStamp;
      persistedData = merged;
      if (typeof window !== 'undefined') {
        if (localStorage.getItem(PENDING_KEY) === payload) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          localStorage.removeItem(PENDING_KEY);
          localStorage.removeItem(PENDING_STAMP_KEY);
          localStorage.removeItem(PENDING_BASE_KEY);
        } else if (localStorage.getItem(PENDING_KEY)) {
          localStorage.setItem(PENDING_STAMP_KEY, nextStamp);
          localStorage.setItem(PENDING_BASE_KEY, payload);
        }
      }
      return 'saved';
      }
      return 'conflict';
    } catch (err) {
      console.error('Помилка збереження на сервері:', err);
      return 'offline';
    }
  };

  const result = saveQueue.then((previous) => previous === 'saved' ? write() : previous);
  saveQueue = result;
  return result;
}

/** Повторення можливе лише проти тієї ревізії, з якої почались локальні зміни. */
export function retryPendingDatabase(): Promise<SaveStatus> {
  const pending = getPendingDatabase();
  if (!pending) return Promise.resolve('saved');
  if (!serverStamp) return Promise.resolve('offline');
  const originalBase = localStorage.getItem(PENDING_BASE_KEY);
  if (localStorage.getItem(PENDING_STAMP_KEY) !== serverStamp && !originalBase) return Promise.resolve('conflict');
  saveQueue = Promise.resolve('saved');
  try {
    lastQueuedData = originalBase ? migrateDatabase(JSON.parse(originalBase)) : persistedData;
  } catch {
    return Promise.resolve('conflict');
  }
  return saveDatabase(pending);
}

export function exportDatabaseToFile(data: DatabaseSchema, prefix = 'parents_feedback_backup') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = todayLocalIso();
  a.href = url;
  a.download = `${prefix}_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
