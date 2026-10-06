export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export type Contents = Record<string, string[]>;
export type Slot = { id: string; number?: number; label: string; start: number; end: number; kind: 'class' | 'break' };
const minute = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const classTimes = [['07:00','07:45'],['07:45','08:30'],['08:30','09:15'],['09:30','10:15'],['10:15','11:00'],['11:00','11:45'],['12:45','13:25'],['13:25','14:05'],['14:05','14:40'],['14:40','15:15']];
export const CLASS_SLOTS: Slot[] = classTimes.map(([start,end], i) => ({id:`slot-${i+1}`,number:i+1,label:`Timeslot ${i+1}`,start:minute(start),end:minute(end),kind:'class'}));
export function slotsFor(day: number): Slot[] {
  if (day < 1 || day > 5) return [];
  return [...CLASS_SLOTS.slice(0,day === 5 ? 8 : 10),{id:'break-1',label:'Break 1',start:555,end:570,kind:'break' as const},{id:'break-2',label:'Break 2',start:705,end:765,kind:'break' as const}].sort((a,b) => a.start-b.start);
}
export function getStatus(now: Date) {
  const minuteNow = now.getHours()*60 + now.getMinutes()+now.getSeconds()/60;
  const slots = slotsFor(now.getDay());
  const current = slots.find(s => minuteNow >= s.start && minuteNow < s.end) ?? null;
  for(let offset=0;offset<=7;offset++) {
    const date = new Date(now); date.setDate(date.getDate()+offset);
    const next = slotsFor(date.getDay()).find(s => offset > 0 || s.start > minuteNow);
    if(next) { const at = new Date(date); at.setHours(Math.floor(next.start/60),next.start%60,0,0); return {current,next,nextAt:at,minuteNow}; }
  }
  return {current,next:null,nextAt:null,minuteNow};
}
export function formatTime(minutes: number) { return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`; }
export function blankContents(): Contents { return Object.fromEntries(DAYS.map(day=>[day,Array(10).fill('')])); }
export function parseContents(raw: string | null): Contents {
  const result=blankContents(); if(!raw) return result;
  try { const parsed: unknown = JSON.parse(raw); if(parsed && typeof parsed === 'object') for(const day of DAYS) { const values=(parsed as Record<string, unknown>)[day]; if(Array.isArray(values)) result[day]=result[day].map((_,i)=> typeof values[i]==='string' ? values[i].slice(0,100) : ''); } } catch { /* Recover from invalid stored data. */ }
  return result;
}
