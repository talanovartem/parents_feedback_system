import { describe, it, expect } from 'vitest';
import { getLessonCompletion } from './lessonCompletion';
import { Lesson, Student, LessonStudentEntry } from '../types/feedback';

describe('lessonCompletion', () => {
  const mockLesson: Lesson = {
    id: 'l-1',
    classId: 'c-1',
    date: '2026-09-24',
    lessonNumber: 1,
    topic: 'Тест',
  };

  const mockStudents: Student[] = [
    { id: 's-1', classId: 'c-1', name: 'Учень 1' },
    { id: 's-2', classId: 'c-1', name: 'Учень 2' },
    { id: 's-3', classId: 'c-1', name: 'Учень 3' },
  ];

  it('should detect when no students are graded', () => {
    const records: Record<string, Record<string, LessonStudentEntry>> = {};
    const res = getLessonCompletion(mockLesson, mockStudents, records);

    expect(res.totalStudents).toBe(3);
    expect(res.presentCount).toBe(3);
    expect(res.gradedCount).toBe(0);
    expect(res.isNotGraded).toBe(true);
    expect(res.isFullyGraded).toBe(false);
    expect(res.percentage).toBe(0);
  });

  it('should detect when partially graded', () => {
    const records: Record<string, Record<string, LessonStudentEntry>> = {
      's-1': { 'l-1': { scores: { crit1: 10 } } },
    };
    const res = getLessonCompletion(mockLesson, mockStudents, records);

    expect(res.gradedCount).toBe(1);
    expect(res.isPartiallyGraded).toBe(true);
    expect(res.isFullyGraded).toBe(false);
    expect(res.percentage).toBe(33);
  });

  it('should detect when fully graded with some absentees', () => {
    const records: Record<string, Record<string, LessonStudentEntry>> = {
      's-1': { 'l-1': { scores: { crit1: 11 } } },
      's-2': { 'l-1': { scores: { crit1: 12 } } },
      's-3': { 'l-1': { absent: true, scores: {} } },
    };
    const res = getLessonCompletion(mockLesson, mockStudents, records);

    expect(res.absentCount).toBe(1);
    expect(res.presentCount).toBe(2);
    expect(res.gradedCount).toBe(2);
    expect(res.isFullyGraded).toBe(true);
    expect(res.percentage).toBe(100);
  });
});
