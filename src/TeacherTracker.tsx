import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Users } from 'lucide-react';
import { DAYS, formatTime, schoolClock, SCHOOL_TIME_ZONE } from './schedule';
import type { School } from './school';
import { getTeacherStatus, getTeacherWeek, type TeacherLesson } from './teacherTracker';

export function TeacherList({ school, selectedCode, compact = false }: { school: School; selectedCode?: string; compact?: boolean }) {
 const [search, setSearch] = useState('');
 const teachers = useMemo(() => [...school.teachers].sort((a, b) => a.teacher.localeCompare(b.teacher)), [school.teachers]);
 const filtered = teachers.filter(teacher => `${teacher.teacher} ${teacher.subject} ${teacher.code}`.toLowerCase().includes(search.toLowerCase()));
 return <div className={compact ? 'sidebar-teachers' : 'teacher-directory'}>
  {!compact && <><label className="sr-only" htmlFor="teacher-search">Search teachers</label>
  <input id="teacher-search" type="search" placeholder="Search teachers…" value={search} onChange={event => setSearch(event.target.value)}/></>}
  <nav className="teacher-links" aria-label={compact ? 'Teachers in sidebar' : 'Teacher directory'}>
   {filtered.map(teacher => <a key={teacher.code} href={`/teachers/${teacher.code}`} aria-current={selectedCode === teacher.code ? 'page' : undefined}><span><strong>{teacher.teacher}</strong><small>{teacher.subject} · {teacher.code}</small></span><ChevronRight size={14}/></a>)}
  </nav>
  {!filtered.length && <p className="teacher-empty">{school.teachers.length ? 'No matching teachers.' : 'No teachers have been added yet.'}</p>}
 </div>;
}

function LessonSummary({ lessons }: { lessons: TeacherLesson[] }) {
 if (!lessons.length) return <span>No class scheduled</span>;
 const first = lessons[0];
 return <><strong>{lessons.map(lesson => lesson.className).join(' / ')}</strong><span>{first.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: SCHOOL_TIME_ZONE })} · {formatTime(first.slot.start)} – {formatTime(first.slot.end)}</span></>;
}

function TeacherSchedule({ school, code, now }: { school: School; code: string; now: Date }) {
 const [day, setDay] = useState(() => Math.min(4, Math.max(0, schoolClock(now).weekday - 1)));
 const date = schoolClock(now).date;
 const week = useMemo(() => getTeacherWeek(school, code, new Date(`${date}T00:00:00+07:00`)), [school, code, date]);
 const today = schoolClock(now).weekday - 1;
 const minute = schoolClock(now).minuteNow;
 return <section className="schedule-panel teacher-week" aria-label="Teacher weekly schedule">
  <div className="schedule-heading"><div><h2>Weekly teaching schedule</h2><p>All assigned classes, Monday through Friday.</p></div></div>
  <div className="weekday-tabs" role="tablist" aria-label="Teaching weekday">{DAYS.map((name, index) => <button key={name} id={`teacher-tab-${index}`} role="tab" tabIndex={day === index ? 0 : -1} aria-selected={day === index} aria-controls="teacher-day-panel" className={day === index ? 'selected' : ''} onClick={() => setDay(index)} onKeyDown={event => {
   const next = event.key === 'ArrowRight' ? (index + 1) % 5 : event.key === 'ArrowLeft' ? (index + 4) % 5 : event.key === 'Home' ? 0 : event.key === 'End' ? 4 : null;
   if (next !== null) { event.preventDefault(); setDay(next); document.getElementById(`teacher-tab-${next}`)?.focus(); }
  }}>{name}<span className="day-short">{name.slice(0, 3)}</span>{index === today && <span className="today-dot" aria-label="Today"/>}</button>)}</div>
  <div id="teacher-day-panel" role="tabpanel" aria-labelledby={`teacher-tab-${day}`}>
   <div className="day-summary"><div><strong>{DAYS[day]}</strong><span>{week[day].lessons.length} teaching timeslots</span></div>{day === today && <span className="today-badge">TODAY</span>}</div>
   {week[day].lessons.length ? <div className="teacher-schedule-table"><table><thead><tr><th scope="col">TIME</th><th scope="col">CLASS</th><th scope="col">SLOT</th></tr></thead><tbody>{week[day].lessons.map(({ slot, classes }) => {
    const active = day === today && minute >= slot.start && minute < slot.end;
    return <tr key={slot.id} className={active ? 'active-row' : undefined}><td className="row-time">{formatTime(slot.start)} – {formatTime(slot.end)}</td><td><strong>{classes.join(' / ')}</strong>{active && <span className="now-badge">Now</span>}{classes.length > 1 && <small className="teacher-overlap">Overlapping assignments</small>}</td><td className="slot-number">{String(slot.number).padStart(2, '0')}</td></tr>;
   })}</tbody></table></div> : <p className="teacher-day-empty">No teaching classes scheduled for {DAYS[day]}.</p>}
  </div>
 </section>;
}

export function TeacherTracker({ school, code, now }: { school: School; code?: string; now: Date }) {
 const teacher = school.teachers.find(teacher => teacher.code === code);
 const minute = Math.floor(now.getTime() / 60000);
 const status = useMemo(() => code ? getTeacherStatus(school, code, new Date(minute * 60000)) : null, [school, code, minute]);
 if (!code) return <section className="schedule-panel teacher-directory-panel"><div className="schedule-heading"><div><h2>Find a teacher</h2><p>Choose a teacher to see where they’re teaching now.</p></div><Users size={24}/></div><TeacherList school={school}/></section>;
 if (!teacher || !status) return <section className="loading-panel"><p>This teacher is no longer in the shared timetable.</p><a className="button" href="/teachers">View all teachers</a></section>;
 return <section className="teacher-tracker" aria-label={`${teacher.teacher} class tracker`}>
  <div className="teacher-heading"><div><h2>{teacher.teacher}</h2><p>{teacher.subject} · Teacher {teacher.code}</p></div><a className="button" href="/teachers">All teachers</a></div>
  <div className="teacher-context"><div><small>PREVIOUS CLASS</small><LessonSummary lessons={status.previous}/></div><div><small>NEXT CLASS</small><LessonSummary lessons={status.next}/></div></div>
  <article className="current-card teacher-current"><div className="card-label"><span className="current-dot"/>CURRENT CLASS<span className="pill">{status.current.length ? 'Teaching now' : 'Free time'}</span></div><div className="status-title"><h2>{status.current.length ? status.current.map(lesson => lesson.className).join(' / ') : 'Not teaching right now'}</h2><span className="card-symbol"><BookOpen size={29}/></span></div>
   <p className="lesson-teacher">{status.current.length ? teacher.subject : status.next.length ? 'Your next scheduled class is shown above.' : 'No lessons are assigned to this teacher in the weekly timetable.'}</p>
   {status.current.length > 0 && <p className="slot-time">{formatTime(status.current[0].slot.start)} – {formatTime(status.current[0].slot.end)} · Timeslot {status.current[0].slot.number}</p>}
   {status.current.length > 1 && <p className="teacher-conflict" role="status">Multiple classes are assigned to this teacher at this time. Check the shared timetable.</p>}
  </article>
  <TeacherSchedule key={teacher.code} school={school} code={teacher.code} now={now}/>
 </section>;
}
