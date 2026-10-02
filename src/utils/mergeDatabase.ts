import { DatabaseSchema } from '../types/feedback';

const ABSENT = Symbol('absent');
type Value = unknown | typeof ABSENT;

function same(a: Value, b: Value): boolean {
  return a === b || (a !== ABSENT && b !== ABSENT && JSON.stringify(a) === JSON.stringify(b));
}

function isObject(value: Value): value is Record<string, unknown> {
  return value !== ABSENT && value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasIds(value: Value): value is Array<{ id: string }> {
  return Array.isArray(value) && value.every((item) => isObject(item) && typeof item.id === 'string');
}

function mergeValue(base: Value, local: Value, remote: Value, key = ''): Value {
  if (same(local, base)) return remote;
  if (same(remote, base) || same(local, remote)) return local;

  // KP може нараховуватися одночасно у вчительській вкладці та через форму учня.
  if (key === 'karpatyPoints' && [base, local, remote].every((v) => typeof v === 'number')) {
    return (local as number) + (remote as number) - (base as number);
  }

  if (isObject(local) && isObject(remote) && (isObject(base) || base === ABSENT)) {
    const original = isObject(base) ? base : {};
    const result: Record<string, unknown> = {};
    for (const name of new Set([...Object.keys(original), ...Object.keys(local), ...Object.keys(remote)])) {
      const merged = mergeValue(
        Object.prototype.hasOwnProperty.call(original, name) ? original[name] : ABSENT,
        Object.prototype.hasOwnProperty.call(local, name) ? local[name] : ABSENT,
        Object.prototype.hasOwnProperty.call(remote, name) ? remote[name] : ABSENT,
        name
      );
      if (merged !== ABSENT) result[name] = merged;
    }
    return result;
  }

  if (hasIds(local) && hasIds(remote) && (hasIds(base) || base === ABSENT)) {
    const original = hasIds(base) ? base : [];
    const fromBase = new Map(original.map((item) => [item.id, item]));
    const fromLocal = new Map(local.map((item) => [item.id, item]));
    const fromRemote = new Map(remote.map((item) => [item.id, item]));
    const ids = new Set([...original.map((item) => item.id), ...remote.map((item) => item.id), ...local.map((item) => item.id)]);
    const result: unknown[] = [];
    for (const id of ids) {
      const merged = mergeValue(fromBase.get(id) ?? ABSENT, fromLocal.get(id) ?? ABSENT, fromRemote.get(id) ?? ABSENT);
      if (merged !== ABSENT) result.push(merged);
    }
    return result;
  }

  throw new Error('Одне й те саме поле змінено в обох версіях бази');
}

/** Об'єднує незалежні правки; суперечливі правки одного поля потребують ручного вибору. */
export function mergeDatabase(base: DatabaseSchema, local: DatabaseSchema, remote: DatabaseSchema): DatabaseSchema {
  return mergeValue(base, local, remote) as DatabaseSchema;
}
