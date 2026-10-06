import { DAYS } from './schedule';
import { validateTeachers } from './teachers';
import type { Snapshot } from './useSharedSchool';
export async function readApiResponse(response: Response): Promise<unknown> {
 let data: unknown;
 try { data = await response.json(); }
 catch {
  throw new Error(response.status >= 500
   ? 'The schedule server could not start. Please try again shortly; the deployment may need attention.'
   : 'The schedule server returned an unreadable response. Please reload the app and try again.');
 }
 if (!response.ok) {
  const error = data && typeof data === 'object' ? (data as Record<string, unknown>).error : undefined;
  throw new Error(typeof error === 'string' ? error : `Could not load shared data (HTTP ${response.status}).`);
 }
 return data;
}
export function parseSnapshot(value: unknown): Snapshot {
 const fail = () => { throw new Error('The schedule server returned incomplete timetable data. Please reload and try again.'); };
 if (!value || typeof value !== 'object') return fail();
 const v = value as Record<string, unknown>;
 if (!Number.isSafeInteger(v.revision) || Number(v.revision) < 1 || !Array.isArray(v.teachers) || !v.classes || typeof v.classes !== 'object' || Array.isArray(v.classes)) return fail();
 try { validateTeachers(v.teachers, true); } catch { return fail(); }
 const classes = Object.entries(v.classes);
 if (!classes.length) return fail();
 for (const [name, days] of classes) {
  if (!name || ['__proto__', 'constructor', 'prototype'].includes(name) || !days || typeof days !== 'object') return fail();
  for (const day of DAYS) {
   const slots = (days as Record<string, unknown>)[day];
   if (!Array.isArray(slots) || slots.length !== 10 || slots.some(slot => typeof slot !== 'string')) return fail();
  }
 }
 return value as Snapshot;
}
export async function requestSchool(init: RequestInit = {}) {
 let response: Response;
 try { response = await fetch('/api/school', init); }
 catch { throw new Error('Unable to reach the schedule server. Check your connection and try again.'); }
 return readApiResponse(response);
}
