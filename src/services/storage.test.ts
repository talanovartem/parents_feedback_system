import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyDatabase } from './migration';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('database synchronization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', memoryStorage());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends rapid saves in order with the revision returned by the previous save', async () => {
    const initial = createEmptyDatabase();
    const posted: RequestInit[] = [];
    let releaseFirst!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (!options) return new Response(JSON.stringify(initial), { headers: { ETag: '"v1"' } });
      posted.push(options);
      const writeNumber = posted.length;
      if (writeNumber === 1) await firstCanFinish;
      return new Response('{}', { headers: { ETag: writeNumber === 1 ? '"v2"' : '"v3"' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchDatabase, saveDatabase, getPendingDatabase } = await import('./storage');
    await fetchDatabase();

    const first = saveDatabase({ ...initial, classes: [{ id: 'a', name: '6-А' }] });
    const second = saveDatabase({ ...initial, classes: [{ id: 'a', name: '6-А' }, { id: 'b', name: '6-Б' }] });
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    releaseFirst();

    expect(await Promise.all([first, second])).toEqual(['saved', 'saved']);
    expect((posted[0].headers as Record<string, string>)['If-Match']).toBe('"v1"');
    expect((posted[1].headers as Record<string, string>)['If-Match']).toBe('"v2"');
    expect(getPendingDatabase()).toBeNull();
  });

  it('rebases a teacher edit over feedback saved by a student in another tab', async () => {
    const initial = createEmptyDatabase();
    const feedback = { id: 's:l', studentId: 's', lessonId: 'l', mood: 'normal' as const, selfGrade: 3, insight: 'Зрозумів тему', bonusGranted: false, createdAt: 'now' };
    let server = initial;
    let revision = '"v1"';
    let revisionNumber = 1;
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method !== 'POST') return new Response(JSON.stringify(server), { headers: { ETag: revision } });
      if ((options.headers as Record<string, string>)['If-Match'] !== revision) return new Response('{}', { status: 409 });
      server = JSON.parse(options.body as string);
      revision = `"v${++revisionNumber}"`;
      return new Response('{}', { headers: { ETag: revision } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const storage = await import('./storage');
    await storage.fetchDatabase();
    server = { ...initial, lessonFeedback: { [feedback.id]: feedback } };
    revision = '"v2"';
    revisionNumber = 2;

    const teacherEdit = { ...initial, classes: [{ id: 'a', name: '6-А' }] };
    expect(await storage.saveDatabase(teacherEdit)).toBe('saved');
    expect(server.classes).toEqual(teacherEdit.classes);
    expect(server.lessonFeedback).toEqual({ [feedback.id]: feedback });
    expect(storage.getSavedDatabase()).toEqual(server);
    expect(storage.getPendingDatabase()).toBeNull();
  });

  it('keeps public feedback while processing rapid teacher saves', async () => {
    const initial = createEmptyDatabase();
    const feedback = { id: 's:l', studentId: 's', lessonId: 'l', mood: 'normal' as const, selfGrade: 3, insight: 'Зрозумів тему', bonusGranted: false, createdAt: 'now' };
    let server = initial;
    let revision = '"v1"';
    let revisionNumber = 1;
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method !== 'POST') return new Response(JSON.stringify(server), { headers: { ETag: revision } });
      if ((options.headers as Record<string, string>)['If-Match'] !== revision) return new Response('{}', { status: 409 });
      server = JSON.parse(options.body as string);
      revision = `"v${++revisionNumber}"`;
      return new Response('{}', { headers: { ETag: revision } });
    }));
    const storage = await import('./storage');
    await storage.fetchDatabase();
    server = { ...initial, lessonFeedback: { [feedback.id]: feedback } };
    revision = '"v2"';
    revisionNumber = 2;
    const first = { ...initial, classes: [{ id: 'a', name: '6-А' }] };
    const second = { ...first, classes: [...first.classes, { id: 'b', name: '6-Б' }] };

    expect(await Promise.all([storage.saveDatabase(first), storage.saveDatabase(second)])).toEqual(['saved', 'saved']);
    expect(server.classes).toEqual(second.classes);
    expect(server.lessonFeedback).toEqual({ [feedback.id]: feedback });
  });

  it('stops later writes after a conflict and preserves the latest local copy', async () => {
    const initial = createEmptyDatabase();
    let posts = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method !== 'POST') return new Response(JSON.stringify(initial), { headers: { ETag: '"v1"' } });
      posts++;
      return new Response('{}', { status: 409 });
    }));
    const { fetchDatabase, saveDatabase, getPendingDatabase } = await import('./storage');
    await fetchDatabase();

    const first = saveDatabase({ ...initial, classes: [{ id: 'a', name: '6-А' }] });
    const second = saveDatabase({ ...initial, classes: [{ id: 'b', name: '6-Б' }] });

    expect(await Promise.all([first, second])).toEqual(['conflict', 'conflict']);
    expect(posts).toBe(1);
    expect(getPendingDatabase()?.classes).toEqual([{ id: 'b', name: '6-Б' }]);
  });

  it('does not report success when the server rejects a write', async () => {
    const initial = createEmptyDatabase();
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) =>
      options
        ? new Response('{"error":"Не вдалося зберегти файл"}', { status: 500 })
        : new Response(JSON.stringify(initial), { headers: { ETag: '"v1"' } })
    ));
    const { fetchDatabase, saveDatabase, getPendingDatabase, getLastSaveError } = await import('./storage');
    await fetchDatabase();

    const result = await saveDatabase({ ...initial, classes: [{ id: 'a', name: '6-А' }] });

    expect(result).toBe('server-error');
    expect(getLastSaveError()).toBe('Не вдалося зберегти файл');
    expect(getPendingDatabase()?.classes).toEqual([{ id: 'a', name: '6-А' }]);
  });

  it('keeps an unsent local copy when the page later loads newer server data', async () => {
    const initial = createEmptyDatabase();
    const localChange = { ...initial, classes: [{ id: 'local', name: '6-А' }] };
    const serverChange = { ...initial, classes: [{ id: 'server', name: '7-А' }] };
    let serverData = initial;
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) =>
      options
        ? new Response('{}', { status: 409 })
        : new Response(JSON.stringify(serverData), { headers: { ETag: '"revision"' } })
    ));
    const firstSession = await import('./storage');
    await firstSession.fetchDatabase();
    expect(await firstSession.saveDatabase(localChange)).toBe('conflict');
    serverData = serverChange;
    vi.resetModules();

    const nextSession = await import('./storage');
    expect((await nextSession.fetchDatabase()).classes).toEqual(serverChange.classes);
    expect(nextSession.getPendingDatabase()?.classes).toEqual(localChange.classes);
  });

  it('does not replace server data with an empty database after an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    const { fetchDatabase } = await import('./storage');

    await expect(fetchDatabase()).rejects.toThrow('HTTP 500');
  });

  it('retries the pending copy after a temporary server error', async () => {
    const initial = createEmptyDatabase();
    const changed = { ...initial, classes: [{ id: 'a', name: '6-А' }] };
    let posts = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (!options) return new Response(JSON.stringify(initial), { headers: { ETag: '"v1"' } });
      posts++;
      return posts === 1
        ? new Response('{"error":"disk"}', { status: 500 })
        : new Response('{}', { headers: { ETag: '"v2"' } });
    }));
    const { fetchDatabase, saveDatabase, retryPendingDatabase, getPendingDatabase } = await import('./storage');
    await fetchDatabase();
    expect(await saveDatabase(changed)).toBe('server-error');
    expect(await retryPendingDatabase()).toBe('saved');
    expect(posts).toBe(2);
    expect(getPendingDatabase()).toBeNull();
  });

  it('does not retry a pending copy on top of a newer server revision', async () => {
    const initial = createEmptyDatabase();
    const serverChange = { ...initial, classes: [{ id: 'a', name: '7-А' }] };
    let revision = '"v1"';
    let serverData = initial;
    let posts = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method !== 'POST') return new Response(JSON.stringify(serverData), { headers: { ETag: revision } });
      posts++;
      return new Response('{}', { status: 409 });
    }));
    const first = await import('./storage');
    await first.fetchDatabase();
    expect(await first.saveDatabase({ ...initial, classes: [{ id: 'a', name: '6-А' }] })).toBe('conflict');
    revision = '"v2"';
    serverData = serverChange;
    vi.resetModules();
    const second = await import('./storage');
    await second.fetchDatabase();
    expect(await second.retryPendingDatabase()).toBe('conflict');
    expect(posts).toBe(1);
  });

  it('rebases a pending local edit after a page reload when the server gained public feedback', async () => {
    const initial = createEmptyDatabase();
    const local = { ...initial, classes: [{ id: 'a', name: '6-А' }] };
    const feedback = { id: 's:l', studentId: 's', lessonId: 'l', mood: 'normal' as const, selfGrade: 3, insight: 'Зрозумів тему', bonusGranted: false, createdAt: 'now' };
    let server = initial;
    let revision = '"v1"';
    let allowWrite = false;
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method !== 'POST') return new Response(JSON.stringify(server), { headers: { ETag: revision } });
      if (!allowWrite || (options.headers as Record<string, string>)['If-Match'] !== revision) return new Response('{}', { status: 409 });
      server = JSON.parse(options.body as string);
      revision = '"v3"';
      return new Response('{}', { headers: { ETag: revision } });
    }));
    const firstSession = await import('./storage');
    await firstSession.fetchDatabase();
    expect(await firstSession.saveDatabase(local)).toBe('conflict');
    server = { ...initial, lessonFeedback: { [feedback.id]: feedback } };
    revision = '"v2"';
    allowWrite = true;
    vi.resetModules();

    const nextSession = await import('./storage');
    await nextSession.fetchDatabase();
    expect(await nextSession.retryPendingDatabase()).toBe('saved');
    expect(server.classes).toEqual(local.classes);
    expect(server.lessonFeedback).toEqual({ [feedback.id]: feedback });
    expect(nextSession.getPendingDatabase()).toBeNull();
  });

  it('inspects a newer server version without losing pending changes, then accepts it explicitly', async () => {
    const initial = createEmptyDatabase();
    const local = { ...initial, classes: [{ id: 'local', name: '6-А' }] };
    const remote = { ...initial, classes: [{ id: 'remote', name: '7-А' }] };
    let serverData = initial;
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) =>
      options?.method === 'POST'
        ? new Response('{}', { status: 409 })
        : new Response(JSON.stringify(serverData), { headers: { ETag: serverData === initial ? '"v1"' : '"v2"' } })
    ));
    const storage = await import('./storage');
    await storage.fetchDatabase();
    expect(await storage.saveDatabase(local)).toBe('conflict');
    serverData = remote;

    const snapshot = await storage.inspectServerDatabase();
    expect(snapshot.data.classes).toEqual(remote.classes);
    expect(storage.getPendingDatabase()?.classes).toEqual(local.classes);

    storage.acceptServerDatabase(snapshot);
    expect(storage.getPendingDatabase()).toBeNull();
    expect((await storage.fetchDatabase()).classes).toEqual(remote.classes);
  });
});
