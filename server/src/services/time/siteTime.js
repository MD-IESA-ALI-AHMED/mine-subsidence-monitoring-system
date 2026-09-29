import { IST_OFFSET_MIN } from '@subsidence/shared';

export const MIN_MS = 60_000;
export const DAY_MS = 86_400_000;

/** The most recent IST midnight at or before `date`. */
export function istMidnightAtOrBefore(date) {
  const offset = IST_OFFSET_MIN * MIN_MS;
  return new Date(Math.floor((date.getTime() + offset) / DAY_MS) * DAY_MS - offset);
}

export const addMinutes = (date, min) => new Date(date.getTime() + min * MIN_MS);
export const minutesBetween = (a, b) => (b.getTime() - a.getTime()) / MIN_MS;
