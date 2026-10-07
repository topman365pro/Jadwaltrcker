import { DAYS, slotsForDate, schoolClock, schoolDay, weekDate, slotAt, type Slot } from './schedule';
import { codesIn, type School } from './school';
import { unexpiredOverrides } from './announcements';

export type TeacherLesson = { className: string; slot: Slot; start: Date; end: Date };

function teacherDay(school: School, code: string, date: Date) {
 const day = DAYS[schoolClock(date).weekday - 1];
 return {
  day,
  lessons: slotsForDate(date, school.bellOverrides).filter(slot => slot.number).flatMap(slot => {
   const classes = Object.entries(school.classes)
    .filter(([, contents]) => codesIn(contents[day]?.[slot.number! - 1] || '').includes(code))
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
   return classes.length ? [{ slot, classes }] : [];
  }),
 };
}

export function getTeacherWeek(school: School, code: string, now = new Date()) {
 school = { ...school, bellOverrides: unexpiredOverrides(school.bellOverrides, now) };
 return DAYS.map((_, index) => teacherDay(school, code, weekDate(now, index + 1)));
}

// Include the adjacent weeks so previous/next also work outside school hours.
export function getTeacherStatus(school: School, code: string, now: Date) {
 school = { ...school, bellOverrides: unexpiredOverrides(school.bellOverrides, now) };
 const lessons: TeacherLesson[] = [];
 for (let offset = -7; offset <= 7; offset++) {
  const date = schoolDay(now, offset);
  const day = teacherDay(school, code, date);
  for (const { slot, classes } of day.lessons) {
   for (const className of classes) {
    const start = slotAt(date, slot.start), end = slotAt(date, slot.end);
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
