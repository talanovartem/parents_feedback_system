import { describe, it, expect } from 'vitest';
import { applyCopyLessonResults } from './lessonResults';
import { createEmptyDatabase } from '../services/migration';
import { DatabaseSchema } from '../types/feedback';

const all = { copyScores: true, copyAttendance: true, copyNotes: true };

function makeDb(): DatabaseSchema {
  const db = createEmptyDatabase();
  db.classes.push({ id: 'c1', name: '8-А' }, { id: 'c2', name: '8-Б' });
  db.students.push(
    { id: 's1', classId: 'c1', name: 'Учень А' },
    { id: 's2', classId: 'c1', name: 'Учень Б' },
    { id: 's3', classId: 'c2', name: 'Учень В' }
  );
  db.lessons.push(
    { id: 'src', classId: 'c1', date: '2026-09-22', lessonNumber: 1 },
    { id: 'dst', classId: 'c1', date: '2026-09-24', lessonNumber: 2 },
    { id: 'foreign', classId: 'c2', date: '2026-09-24', lessonNumber: 2 }
  );
  db.records = {
    s1: {
      src: { scores: { behavior: 10 }, absent: false, notes: 'активний' },
      dst: { scores: { behavior: 3 } },
    },
    s3: { foreign: { scores: { behavior: 12 } } },
  };
  return db;
}

describe('applyCopyLessonResults', () => {
  it('копіює оцінки, відвідуваність і примітки', () => {
    const res = applyCopyLessonResults(makeDb(), 'src', 'dst', all);
    expect(res.records.s1.dst).toEqual({ scores: { behavior: 10 }, absent: false, notes: 'активний' });
  });

  it('учні без запису в джерелі очищують ціль (дзеркальна семантика)', () => {
    const res = applyCopyLessonResults(makeDb(), 'src', 'dst', all);
    // У s2 немає запису в src — цільеже стає порожньою
    expect(res.records.s2?.dst).toEqual({ scores: {} });
  });

  it('не зачіпає записи інших класів', () => {
    const res = applyCopyLessonResults(makeDb(), 'src', 'dst', all);
    expect(res.records.s3).toEqual({ foreign: { scores: { behavior: 12 } } });
  });

  it('відмовляє копіювати між різними класами', () => {
    const db = makeDb();
    const res = applyCopyLessonResults(db, 'src', 'foreign', all);
    expect(res).toBe(db);
  });

  it('часткове копіювання зберігає решту полів цілі', () => {
    const res = applyCopyLessonResults(makeDb(), 'src', 'dst', {
      copyScores: true,
      copyAttendance: false,
      copyNotes: false,
    });
    expect(res.records.s1.dst.scores).toEqual({ behavior: 10 });
    expect(res.records.s1.dst.absent).toBeUndefined(); // у цілі не було
    expect(res.records.s1.dst.notes).toBeUndefined();
  });
});
