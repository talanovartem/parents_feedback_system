import { describe, expect, it } from 'vitest';
import { getScheduleWeekDates, shiftScheduleDate } from './scheduleDates';

describe('schedule dates', () => {
  it('shows a Monday-to-Sunday week across a month boundary', () => {
    expect(getScheduleWeekDates('2026-10-03')).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01',
      '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
  });

  it('keeps Sunday in the week that began six days earlier', () => {
    expect(getScheduleWeekDates('2027-01-03')[0]).toBe('2026-12-28');
  });

  it('moves one day across a year boundary', () => {
    expect(shiftScheduleDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftScheduleDate('2027-01-01', -1)).toBe('2026-12-31');
  });
});
