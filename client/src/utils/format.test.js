import { describe, expect, it } from 'vitest';
import { formatNumber, tiltValue, withUnit } from './format.js';
import {
  formatDateTime,
  formatFeedTime,
  formatHours,
  formatRelative,
  formatTime,
  limitText,
} from './time.js';

describe('number formatting', () => {
  it('uses sensible decimals', () => {
    expect(formatNumber(42)).toBe('42.0');
    expect(formatNumber(612.4)).toBe('612');
    expect(formatNumber(0.623)).toBe('0.62');
    expect(formatNumber(null)).toBe('—');
  });
  it('joins value and unit with a thin space', () => {
    expect(withUnit(42, 'mm')).toBe('42.0 mm');
  });
  it('shows tilt in mm/m or degrees', () => {
    expect(tiltValue(1500)).toMatchObject({ value: 1.5, unit: 'mm/m' });
    expect(tiltValue(1500, 'deg').value).toBeCloseTo(0.0859, 3);
  });
});

describe('time formatting (IST)', () => {
  const t = '2026-10-03T06:10:00Z'; // 11:40 IST
  it('formats in IST', () => {
    expect(formatTime(t)).toBe('11:40');
    expect(formatDateTime(t)).toBe('3 Oct 11:40');
  });
  it('formats relative time against site time', () => {
    expect(formatRelative('2026-10-03T06:06:00Z', t)).toBe('4 min ago');
    expect(formatRelative('2026-10-02T06:10:00Z', t)).toBe('24 h ago');
  });
  it('adds the weekday to feed times from earlier days', () => {
    expect(formatFeedTime('2026-10-03T02:00:00Z', t)).toBe('07:30');
    expect(formatFeedTime('2026-10-02T08:00:00Z', t)).toBe('Fri 13:30');
  });
  it('says when the limit is already reached', () => {
    expect(limitText(0)).toBe('limit reached');
    expect(limitText(26)).toBe('limit in 26 h');
    expect(limitText(null)).toBeNull();
  });
  it('formats time to limit', () => {
    expect(formatHours(26.2)).toBe('26 h');
    expect(formatHours(3.46)).toBe('3.5 h');
    expect(formatHours(100)).toBe('4 d 4 h');
  });
});
