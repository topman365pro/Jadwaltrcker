import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnnouncement, unexpiredOverrides, validateBellOverrides } from './announcements';
import { getStatus, schoolClock, slotsForDate, weekDate } from './schedule';
import { getTeacherStatus, getTeacherWeek } from './teacherTracker';
import { blankContents } from './schedule';
import type { School } from './school';

const religious = `INFO JAM KBM
"""""""""""""""""""""""
Rabu,  7 Oktober 2026

Sehubungan dengan Kegiatan Keagamaan Rutin Awal Bulan Oktober 2026 untuk Bapak Ibu Guru Karyawan, seluruh murid kelas X, XI dan XII, serta Mahasiswa PLP UNS dan PPL UTP SMA Negeri 1 Surakarta maka jam KBM diatur sebagai berikut :

1. 07.00 - 07.30
2. 07.30 - 08.00
3. 08.00 - 08.30
4. 08.30 - 09.00
Istirahat
5. 09.15 - 09.40
6. 09.40 - 10.05
7. 10.05 -  10.30
8. 10.30 -  10.55
Istirahat
9. 11.10 - 11.35
10. 11.35 - 12.00

Khusus bagi murid kelas XII yang mengikuti GLADI BERSIH TKA SESI 3 tetap menuju lab sesuai jadwal dan mengikuti kegiatan keagamaan jika telah selesai.
Demikian informasi yang dapat kami sampaikan, atas perhatian dan kerjasamanya kami mengucapkan terima kasih.
Waka Bidang Kurikulum`;

const assembly = `INFO KURIKULUM
==============
Kepada:
Yang kami hormati Bapak Ibu Guru dan Karyawan serta yang berbahagia seluruh murid SMA N 1 Surakarta

Sehubungan dengan kegiatan Upacara Bendera dalam rangka Hari Kesaktian Pancasila Kamis, 1 Oktober 2026 maka jam KBM diatur sebagai berikut:

1. 08.30-09.00
2. 09.00-09.30
        Istirahat pertama
3. 09.45-10.15
4. 10.15-10.45
5. 10.45-11.15
6. 11.15-11.45
        Istirahat kedua
7. 12.45-13.25
8. 13.25-14.05
9. 14.05-14.40
10. 14.40-15.15
Demikian informasi yang kami sampaikan, atas perhatian Bapak Ibu dan muris sekalian kami ucapkan terima kasih.
Waka Bidang Kurikulum`;

test('parses both supplied announcements and infers their different break positions', () => {
 const first = parseAnnouncement(religious), second = parseAnnouncement(assembly);
 assert.equal(first.date, '2026-10-07'); assert.equal(second.date, '2026-10-01');
 assert.equal(first.periods.length, 10); assert.equal(second.periods.length, 10);
 assert.deepEqual(first.periods[9], { number: 10, start: 695, end: 720 });
 const breaks = (text: string) => { const override = parseAnnouncement(text); return slotsForDate(new Date(`${override.date}T00:00+07:00`), [override]).filter(slot => slot.kind === 'break').map(({ start, end }) => [start, end]); };
 assert.deepEqual(breaks(religious), [[540, 555], [655, 670]]);
 assert.deepEqual(breaks(assembly), [[570, 585], [705, 765]]);
});

test('accepts colon clocks, Windows newlines, unicode dashes, and full numeric dates', () => {
 for (const date of ['7 October 2026', '07/10/2026', '07-10-2026', '2026-10-07']) {
  assert.deepEqual(parseAnnouncement(`${date}\r\n1) 7:00–07:30\r\n2. 07:45 — 08:00`), { date: '2026-10-07', periods: [{ number: 1, start: 420, end: 450 }, { number: 2, start: 465, end: 480 }] });
 }
});

test('rejects ambiguous, malformed, incomplete and overlapping input without silently skipping periods', () => {
 for (const text of ['', '1. 07.00 - 07.30', `${religious}\n1 Oktober 2026`, religious.replace('7 Oktober', '32 Oktober'), religious.replace('7 Oktober', '10 Oktober'), religious.replace('07.30 - 08.00', '07.20 - 08.00'), religious.replace('2. 07.30', '3. 07.30'), religious.replace('07.30 - 08.00', '07.30 - 08.99'), religious.replace('2. 07.30 - 08.00', '2. 07.30'), religious.replace('07.00 - 07.30', '07.30 - 07.00')]) assert.throws(() => parseAnnouncement(text));
 assert.throws(() => validateBellOverrides([parseAnnouncement(religious), parseAnnouncement(religious)]), /one bell schedule/);
 assert.throws(() => validateBellOverrides([{ date: '2026-02-30', periods: [] }]), /Invalid announcement date/);
});

test('student status and next-day lookahead use each date’s bell schedule at exact boundaries', () => {
 const overrides = [parseAnnouncement(religious), parseAnnouncement(assembly)];
 assert.equal(getStatus(new Date('2026-10-07T08:30:00+07:00'), false, overrides).current?.number, 4);
 assert.equal(getStatus(new Date('2026-10-07T09:00:00+07:00'), false, overrides).current?.kind, 'break');
 assert.equal(getStatus(new Date('2026-10-07T09:00:00+07:00'), true, overrides).next?.number, 5);
 assert.equal(getStatus(new Date('2026-10-07T12:00:00+07:00'), true, overrides).current, null);
 assert.equal(getStatus(new Date('2026-09-30T16:00:00+07:00'), true, overrides).nextAt?.toISOString(), '2026-10-01T01:30:00.000Z');
 assert.equal(getStatus(new Date('2026-10-07T12:00:00+07:00'), true, overrides).nextAt?.toISOString(), '2026-10-08T00:00:00.000Z');
});

test('cached overrides expire at midnight WIB and do not recur on the same weekday next week', () => {
 const overrides = [parseAnnouncement(religious)];
 assert.equal(unexpiredOverrides(overrides, new Date('2026-10-07T16:59:59Z')).length, 1);
 assert.equal(unexpiredOverrides(overrides, new Date('2026-10-07T17:00:00Z')).length, 0);
 assert.deepEqual(schoolClock(new Date('2026-10-07T17:00:00Z')), { date: '2026-10-08', weekday: 4, minuteNow: 0 });
 assert.equal(slotsForDate(new Date('2026-10-14T08:30:00+07:00'), overrides).find(slot => slot.number === 4)?.start, 570);
 const future = parseAnnouncement(assembly.replace('1 Oktober', '15 Oktober'));
 assert.deepEqual(unexpiredOverrides([...overrides, future], new Date('2026-10-08T00:00:00+07:00')), [future]);
});

test('teacher tracking follows temporary times and returns to default after expiration', () => {
 const contents = blankContents(); contents.Wednesday[3] = '01'; contents.Wednesday[4] = '01';
 const school: School = { classes: { 'X.1': contents }, teachers: [], selectedClass: 'X.1', bellOverrides: [parseAnnouncement(religious)] };
 const now = new Date('2026-10-07T08:30:00+07:00');
 assert.equal(getTeacherStatus(school, '01', now).current[0]?.slot.number, 4);
 assert.equal(getTeacherStatus(school, '01', new Date('2026-10-07T09:00:00+07:00')).current.length, 0);
 assert.deepEqual(getTeacherWeek(school, '01', now)[2].lessons.map(lesson => lesson.slot.start), [510, 555]);
 const tomorrow = new Date('2026-10-08T00:00:00+07:00');
 assert.equal(schoolClock(weekDate(tomorrow, 3)).date, '2026-10-07');
 assert.deepEqual(getTeacherWeek(school, '01', tomorrow)[2].lessons.map(lesson => lesson.slot.start), [570, 615]);
 assert.equal(getTeacherStatus(school, '01', new Date('2026-10-14T08:30:00+07:00')).current.length, 0);
});
