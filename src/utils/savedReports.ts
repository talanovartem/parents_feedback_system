import { DatabaseSchema, SavedReport } from '../types/feedback';

export function isReportSent(db: DatabaseSchema, studentId: string, period: string): boolean {
  const key = `${studentId}:${period}`;
  return !!(db.sentReports?.[key] || db.savedReports?.[key]?.sentAt);
}

/** Збережені тексти учня, від найновішого до найстарішого. */
export function getStudentReports(
  reports: Record<string, SavedReport> | undefined,
  studentId: string
): SavedReport[] {
  return Object.values(reports || {})
    .filter((report) => report.studentId === studentId && report.content.trim())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
