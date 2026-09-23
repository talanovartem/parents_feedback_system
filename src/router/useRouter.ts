import { useState, useEffect, useCallback } from 'react';

export type AppRoute =
  | { name: 'schedule' }
  | { name: 'journal'; classId?: string }
  | { name: 'dashboard' }
  | { name: 'reports'; classOrParallelId?: string }
  | { name: 'student'; studentId: string }
  | { name: 'feedback'; lessonId: string }
  | { name: 'student-portal'; studentId: string };

export function parseHash(hash: string): AppRoute {
  const clean = hash.replace(/^#\/?/, '').trim();
  if (!clean || clean === 'schedule') {
    return { name: 'schedule' };
  }

  const parts = clean.split('/').filter(Boolean);

  if (parts[0] === 'journal') {
    return { name: 'journal' };
  }

  if (parts[0] === 'dashboard') {
    return { name: 'dashboard' };
  }

  if (parts[0] === 'reports') {
    return { name: 'reports', classOrParallelId: parts[1] };
  }

  if (parts[0] === 'student' && parts[1]) {
    return { name: 'student', studentId: parts[1] };
  }

  if ((parts[0] === 'feedback' || parts[0] === 'lesson-feedback') && parts[1]) {
    return { name: 'feedback', lessonId: parts[1] };
  }

  if (parts[0] === 'class' && parts[1]) {
    return { name: 'journal', classId: parts[1] };
  }

  if (parts[0] === 'my' && parts[1]) {
    return { name: 'student-portal', studentId: parts[1] };
  }

  return { name: 'schedule' };
}

export function getScheduleHash(): string {
  return `#/schedule`;
}

export function getStudentHash(studentId: string): string {
  return `#/student/${studentId}`;
}

export function getLessonFeedbackHash(lessonId: string): string {
  return `#/feedback/${lessonId}`;
}

export function getClassHash(classId: string): string {
  return `#/class/${classId}`;
}

export function getJournalHash(classId?: string): string {
  return classId ? `#/class/${classId}` : `#/journal`;
}

export function getDashboardHash(): string {
  return `#/dashboard`;
}

export function getReportsHash(filterId?: string): string {
  return filterId ? `#/reports/${filterId}` : `#/reports`;
}

export function getStudentPortalHash(studentId: string): string {
  return `#/my/${studentId}`;
}

export function useRouter() {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { name: 'schedule' }
  );

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((hash: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = hash.startsWith('#') ? hash : `#/${hash}`;
    }
  }, []);

  return { route, navigate };
}
