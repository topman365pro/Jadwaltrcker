import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankContents } from './schedule';
import type { School } from './school';
import { getTeacherStatus, getTeacherWeek } from './teacherTracker';

function fixture(): School {
 const a = blankContents(), b = blankContents();
 a.Monday[0] = '01'; a.Monday[2] = '01, 02'; a.Friday[7] = '01';
 b.Monday[1] = '01'; b.Friday[8] = '01';
 return { teachers: [], classes: { '10 A': a, '10 B': b }, selectedClass: '10 A' };
}
test('tracks a teacher across classes and switches at exact boundaries', () => {
 const status = getTeacherStatus(fixture(), '01', new Date(2026, 9, 5, 7, 45));
 assert.deepEqual(status.previous.map(l => l.className), ['10 A']);
 assert.deepEqual(status.current.map(l => l.className), ['10 B']);
 assert.deepEqual(status.next.map(l => l.className), ['10 A']);
 assert.equal(status.next[0].slot.number, 3);
});
test('breaks and weekends retain previous and next lessons', () => {
 const school = fixture();
 const duringBreak = getTeacherStatus(school, '01', new Date(2026, 9, 5, 9, 15));
 assert.equal(duringBreak.current.length, 0);
 assert.equal(duringBreak.previous[0].slot.number, 3);
 const weekend = getTeacherStatus(school, '01', new Date(2026, 9, 10, 12));
 assert.equal(weekend.current.length, 0);
 assert.equal(weekend.previous[0].start.getDay(), 5);
 assert.equal(weekend.previous[0].slot.number, 8);
 assert.equal(weekend.next[0].start.getDay(), 1);
 assert.equal(weekend.next[0].start.getDate(), 12);
});
test('includes co-teaching codes, exposes simultaneous assignments and handles unassigned teachers', () => {
 const school = fixture();
 school.classes['10 B'].Monday[2] = '02';
 assert.equal(getTeacherStatus(school, '02', new Date(2026, 9, 5, 8, 30)).current.length, 2);
 assert.deepEqual(getTeacherStatus(school, '99', new Date(2026, 9, 5, 8)), { current: [], previous: [], next: [] });
});

test('weekly schedule groups classes by timeslot, includes co-teaching and respects Friday hours', () => {
 const school = fixture();
 school.classes['10 B'].Monday[2] = '01';
 const week = getTeacherWeek(school, '01');
 assert.deepEqual(week.map(day => day.day), ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
 assert.deepEqual(week[0].lessons.map(lesson => [lesson.slot.number, lesson.classes]), [[1, ['10 A']], [2, ['10 B']], [3, ['10 A', '10 B']]]);
 assert.equal(week[1].lessons.length, 0);
 assert.deepEqual(week[4].lessons.map(lesson => lesson.slot.number), [8]);
 assert.equal(getTeacherWeek(school, '02')[0].lessons[0].slot.number, 3);
 assert.ok(getTeacherWeek(school, '99').every(day => day.lessons.length === 0));
});
