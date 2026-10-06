import { DAYS, slotsFor, type Slot } from './schedule';
import { codesIn, type School } from './school';

export type TeacherLesson = { className: string; slot: Slot; start: Date; end: Date };

export function getTeacherWeek(school: School, code: string) {
 return DAYS.map((day, index) => ({
  day,
  lessons: slotsFor(index + 1).filter(slot => slot.number).flatMap(slot => {
   const classes = Object.entries(school.classes)
    .filter(([, contents]) => codesIn(contents[day]?.[slot.number! - 1] || '').includes(code))
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
   return classes.length ? [{ slot, classes }] : [];
  }),
 }));
}

// Include the adjacent weeks so previous/next also work outside school hours.
export function getTeacherStatus(school: School, code: string, now: Date) {
 const lessons: TeacherLesson[] = [];
 const week = getTeacherWeek(school, code);
 for (let offset = -7; offset <= 7; offset++) {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  const day = week[date.getDay() - 1];
  if (!day) continue;
  for (const { slot, classes } of day.lessons) {
   for (const className of classes) {
    const start = new Date(date), end = new Date(date);
    start.setHours(Math.floor(slot.start / 60), slot.start % 60, 0, 0);
    end.setHours(Math.floor(slot.end / 60), slot.end % 60, 0, 0);
    lessons.push({ className, slot, start, end });
   }
  }
 }
 lessons.sort((a, b) => a.start.getTime() - b.start.getTime() || a.className.localeCompare(b.className, undefined, { numeric: true }));
 const current = lessons.filter(lesson => lesson.start <= now && now < lesson.end);
 const past = lessons.filter(lesson => lesson.end <= now);
 const future = lessons.filter(lesson => lesson.start > now);
 const previousEnd = past.at(-1)?.end.getTime();
 const nextStart = future[0]?.start.getTime();
 return {
  current,
  previous: past.filter(lesson => lesson.end.getTime() === previousEnd),
  next: future.filter(lesson => lesson.start.getTime() === nextStart),
 };
}
