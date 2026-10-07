import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, Clock3, Download, Pencil, Check, Coffee, BookOpen, X, ChevronRight, Sun, CheckCircle2 } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { DAYS, blankContents, slotsFor, slotsForDate, schoolClock, weekDate, SCHOOL_TIME_ZONE, getStatus, formatTime, type Contents, type Slot } from './schedule';
import './style.css';
import { DataManager } from './DataManager';
import { unexpiredOverrides } from './announcements';
import { TeacherTracker } from './TeacherTracker';
import { Sidebar } from './Sidebar';
import { resolveLesson, type School } from './school';
import { getEditingKey, unlockEditing, EDIT_KEY, useSharedSchool } from './useSharedSchool';
registerSW({ onRegisterError(error) { console.warn('Offline setup unavailable',error); } });
type InstallEvent = Event & {prompt(): Promise<void>;userChoice:Promise<{outcome:string}>};

function App() {
 const [now,setNow]=useState(new Date());
 const [day,setDay]=useState(Math.min(4,Math.max(0,schoolClock(new Date()).weekday-1)));
 const dataPage=window.location.pathname==='/data';
 const teacherPage=/^\/teachers(?:\/|$)/.test(window.location.pathname);
 const teacherCode=window.location.pathname.split('/')[2];
 const shared=useSharedSchool();
 const {school,contents}=shared;
 const todayDate=schoolClock(now).date;
 const bellOverrides=useMemo(()=>unexpiredOverrides(school.bellOverrides,new Date(`${todayDate}T00:00:00+07:00`)),[school.bellOverrides,todayDate]);
 const [editingKey,setEditingKey]=useState(getEditingKey);
 const [keyDraft,setKeyDraft]=useState('');
 const [unlocking,setUnlocking]=useState(false);
 const canEdit=!!editingKey&&!shared.cachedMode&&!shared.loading&&shared.hasData;
 async function unlock(e:React.FormEvent){e.preventDefault();setUnlocking(true);try{setEditingKey(await unlockEditing(keyDraft));setKeyDraft('');setMessage('Editing unlocked for this tab.');}catch(error){setMessage((error as Error).message);}finally{setUnlocking(false);}}
 function lock(){setEditingKey('');setEditing(false);try{sessionStorage.removeItem(EDIT_KEY);}catch{/* Optional session storage. */}}
 const [draft,setDraft]=useState<Contents>(blankContents);
 const [editing,setEditing]=useState(false);
 const [message,setMessage]=useState('');
 const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null);
 const [installed,setInstalled]=useState(window.matchMedia('(display-mode: standalone)').matches);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);const refresh=()=>setNow(new Date());document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);}; },[]);
 useEffect(()=>{const handler=(e:Event)=>{e.preventDefault();setInstallEvent(e as InstallEvent);}; const completed=()=>{setInstalled(true);setInstallEvent(null);dialog.current?.close();};window.addEventListener('beforeinstallprompt',handler);window.addEventListener('appinstalled',completed);return()=>{window.removeEventListener('beforeinstallprompt',handler);window.removeEventListener('appinstalled',completed);};},[]);
 const clock=schoolClock(now);
 const status=getStatus(now,false,bellOverrides);
 const upcoming=getStatus(now,true,bellOverrides);
 const todayIndex=clock.weekday-1;
 const isToday=day===todayIndex;
 const selectedDate=weekDate(now,day+1);
 const temporary=bellOverrides.find(override=>override.date===schoolClock(selectedDate).date);
 const rows=editing?slotsFor(day+1):slotsForDate(selectedDate,bellOverrides);
 const classCount=rows.filter(slot=>slot.kind==='class').length;
 const endTime=formatTime(rows.at(-1)!.end);
 const values=editing?draft:contents;
 const getLesson=(slot:Slot|null,weekday:number)=>resolveLesson(slot?.number?contents[DAYS[weekday-1]]?.[slot.number-1]||'':'',school.teachers);
 const getTitle=(slot:Slot|null,weekday:number)=>slot?.number ? getLesson(slot,weekday).subject || slot.label : slot?.label || '';
 const currentTitle=status.current ? getTitle(status.current,clock.weekday) : todayIndex<0 || todayIndex>4 ? 'Enjoy your weekend' : status.minuteNow<(slotsForDate(now,bellOverrides)[0]?.start??420) ? 'A fresh day ahead' : 'You’re done for today';
 const nextWeekday=upcoming.nextAt?schoolClock(upcoming.nextAt).weekday:1;
 const nextDay=upcoming.nextAt?.toLocaleDateString(undefined,{weekday:'long',timeZone:SCHOOL_TIME_ZONE});
 const sameNextDay=upcoming.nextAt?schoolClock(upcoming.nextAt).date===clock.date:false;
 const remaining=status.current?Math.max(1,Math.ceil(status.current.end-status.minuteNow)):0;
 const progress=status.current?Math.min(100,(status.minuteNow-status.current.start)/(status.current.end-status.current.start)*100):0;
 const completed=rows.filter(s=>s.kind==='class' && isToday && s.end<=status.minuteNow).length;
 function startEdit(){setDraft(structuredClone(contents));setEditing(true);setMessage('');}
 async function changeSchool(next:School){await shared.save(next,editingKey);setMessage('Shared school data saved.');}
 async function save(){try{await changeSchool({...school,classes:{...school.classes,[school.selectedClass]:draft}});setEditing(false);}catch(error){setMessage((error as Error).message);}}
 async function install(){if(installEvent){await installEvent.prompt();const choice=await installEvent.userChoice;setInstallEvent(null);if(choice.outcome==='accepted')dialog.current?.close();}else dialog.current?.showModal();}
 return <div className="app-shell">
  <Sidebar dataPage={dataPage} teacherPage={teacherPage}/>
  <div className="main-shell"><header className="topbar"><nav className="top-navigation"><a href="/" aria-current={!dataPage&&!teacherPage?'page':undefined}>Dashboard</a><ChevronRight size={14}/><a href="/data" aria-current={dataPage?'page':undefined}>Manage data</a><ChevronRight size={14}/><a href="/teachers" aria-current={teacherPage?'page':undefined}>Teachers</a></nav><button className="install-button" onClick={()=>void install()} disabled={installed}><Download size={16}/>{installed?'Installed':'Install app'}</button></header>
  <main><div className="page-heading"><div><div className="eyebrow">{teacherPage?'FOLLOW THE TEACHING DAY':dataPage?'SHARED SCHOOL DATA':'MAKE TIME FOR YOUR DAY'}</div><h1>{teacherPage?'Teacher tracker':dataPage?'Manage your school':'Your day, at a glance'}<span>.</span></h1><p>{teacherPage?'See each teacher’s previous, current, and next class.':dataPage?'Upload spreadsheets and keep teachers and lessons up to date.':'Stay in the moment. Know what’s coming next.'}</p></div><div className="live-clock"><div><span className="live-dot"/> SURAKARTA · WIB</div><time>{now.toLocaleTimeString('en-GB',{hour12:false,timeZone:SCHOOL_TIME_ZONE})}</time><p>{now.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:SCHOOL_TIME_ZONE})}</p></div></div>
  {shared.error&&<div className="sync-notice" role="status"><p>{shared.hasData?'Showing the last cached timetable. ':''}{shared.error}</p><button className="button" disabled={shared.loading||shared.saving||editing} onClick={()=>void shared.refresh()}>Reload shared data</button></div>}
  {!shared.hasData?<div className="loading-panel" role="status">{shared.loading?'Loading shared timetable…':'No cached timetable is available. Reconnect to load school data.'}</div>:<>
  {teacherPage?<TeacherTracker school={school} code={teacherCode} now={now}/>:<>
  <div className="dashboard-controls"><label className="class-picker">Your class<select aria-label="Your class" value={school.selectedClass} disabled={editing||shared.saving} onChange={e=>shared.selectClass(e.target.value)}>{Object.keys(school.classes).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(name=><option key={name}>{name}</option>)}</select></label><span>{shared.loading?'Refreshing…':shared.cachedMode?'Cached timetable':'Shared timetable'} · Class preference saved in this browser</span></div>
  {dataPage?<section className="management-page" aria-label="Data management"><div className="management-heading"><div><h2>Teachers & timetables</h2><p>Imports and edits update the shared schedule for every device.</p></div><div className="edit-actions"><button className="button" disabled={shared.saving||shared.loading||editing} onClick={()=>void shared.refresh()}>Reload data</button>{editingKey&&<button className="button" disabled={shared.saving} onClick={lock}>Lock editing</button>}</div></div>{!editingKey&&<form className="editing-key-form" onSubmit={e=>void unlock(e)}><label htmlFor="editing-key">Editing key</label><input id="editing-key" type="password" autoComplete="current-password" required value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} placeholder="Enter your editing key"/><button className="button primary" disabled={unlocking}>{unlocking?'Checking…':'Unlock editing'}</button></form>}<DataManager school={school} now={now} onChange={changeSchool} disabled={!canEdit||editing||shared.saving}/><p className="management-note">Choose a class above to edit its weekly timetable below. Teacher mappings apply to all classes.</p></section>:
  <section className="status-grid" aria-label="Current and next timeslot"><article className="current-card"><div className="card-label"><span className="current-dot"/>{status.current?'HAPPENING NOW':'RIGHT NOW'}<span className="pill">{status.current?.kind==='break'?'Break':status.current?'In progress':'Free time'}</span></div><div className="status-title"><h2>{currentTitle}</h2><span className="card-symbol">{status.current?.kind==='break'?<Coffee size={29}/>:status.current?<BookOpen size={29}/>:<Sun size={29}/>}</span></div><p className="slot-time">{status.current?`${formatTime(status.current.start)} – ${formatTime(status.current.end)}`:'Your next slot is shown beside this card.'}</p><p className="lesson-teacher">{getLesson(status.current,clock.weekday).teacher}</p><div className="current-footer">{status.current?<><div className="progress-track"><div style={{width:`${progress}%`}}/></div><div className="progress-description"><span>{status.current.number?`Timeslot ${status.current.number} of ${slotsForDate(now,bellOverrides).filter(slot=>slot.kind==='class').length}`:'Take a breather'}</span><span>{remaining} min left</span></div></>:<div className="free-note"><CheckCircle2 size={16}/> Nothing scheduled right now</div>}</div></article>
  <article className="next-card"><div className="card-label"><Clock3 size={15}/> UP NEXT</div><div className="status-title"><h2>{getTitle(upcoming.next,nextWeekday)}</h2><span className="next-symbol">{upcoming.next?.kind==='break'?<Coffee size={26}/>:<BookOpen size={26}/>}</span></div><p className="slot-time">{upcoming.next&&`${formatTime(upcoming.next.start)} – ${formatTime(upcoming.next.end)}`}</p><p className="lesson-teacher">{getLesson(upcoming.next,nextWeekday).teacher}</p><div className="next-footer"><span>{sameNextDay?'Later today':nextDay} {upcoming.next?.number&&`· Timeslot ${upcoming.next.number}`}</span><span className="starts-in">{upcoming.nextAt&&(sameNextDay?`In ${Math.max(1,Math.ceil((upcoming.nextAt.getTime()-now.getTime())/60000))} min`:upcoming.nextAt.toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:SCHOOL_TIME_ZONE}))}</span></div></article></section>}
  <section className="schedule-panel"><div className="schedule-heading"><div><h2>The weekly lineup</h2><p>A place for every part of your day.</p></div><div className="edit-actions">{dataPage?(editing?<><button className="button quiet" disabled={shared.saving} onClick={()=>setEditing(false)}>Cancel</button><button className="button primary" disabled={shared.saving||!canEdit} onClick={()=>void save()}><Check size={16}/> {shared.saving?'Saving…':'Save changes'}</button></>:<button className="button" disabled={!canEdit||shared.saving} onClick={startEdit}><Pencil size={15}/> Edit schedule</button>):<a className="button" href="/data"><Pencil size={15}/> Manage timetable</a>}</div></div>
  <div className="weekday-tabs" role="tablist" aria-label="Weekday">{DAYS.map((name,i)=><button key={name} id={`tab-${i}`} role="tab" tabIndex={day===i?0:-1} onKeyDown={e=>{const next=e.key==='ArrowRight'?(i+1)%5:e.key==='ArrowLeft'?(i+4)%5:e.key==='Home'?0:e.key==='End'?4:null;if(next!==null){e.preventDefault();setDay(next);document.getElementById(`tab-${next}`)?.focus();}}} aria-selected={day===i} aria-controls="day-panel" className={day===i?'selected':''} onClick={()=>setDay(i)}>{name}<span className="day-short">{name.slice(0,3)}</span>{i===todayIndex&&<span className="today-dot" aria-label="Today"/>}</button>)}</div>
  <div className="day-summary"><div><strong>{DAYS[day]}</strong><span>{classCount} timeslots · Ends at {endTime}</span></div>{isToday?<span className="today-badge">TODAY · {completed}/{classCount} complete</span>:<span className="day-badge">{formatTime(rows[0].start)} start</span>}</div>
  {temporary&&!editing&&<p className="edit-tip">Temporary bell times for {temporary.date} · Defaults return at midnight WIB.</p>}
  {editing&&<p className="edit-tip">Enter teacher codes (e.g. 02 or 02, 06) or an activity for each timeslot. Switch days to edit the whole week, then save.</p>}
  <div id="day-panel" role="tabpanel" aria-labelledby={`tab-${day}`}><div className="table-labels"><span>SLOT</span><span>TIME</span><span>SUBJECT / TEACHER</span><span>STATUS</span></div><div className="schedule-rows">{rows.map(slot=>{const active=isToday&&status.current?.id===slot.id;const past=isToday&&slot.end<=status.minuteNow;const isUpcoming=isToday&&upcoming.next?.id===slot.id&&sameNextDay;return <div key={slot.id} className={`schedule-row ${slot.kind==='break'?'break-row':''} ${active?'active-row':''} ${past?'past-row':''}`}><span className="slot-number">{slot.number?String(slot.number).padStart(2,'0'):<Coffee size={17}/>}</span><span className="row-time">{formatTime(slot.start)} <span>–</span> {formatTime(slot.end)}</span><div className="row-subject">{slot.kind==='break'?<span>{slot.label}<span className="break-description">{slot.end-slot.start} minute break</span></span>:editing?<input disabled={shared.saving} aria-label={`${DAYS[day]} timeslot ${slot.number}`} maxLength={200} placeholder={`Code or activity for slot ${slot.number}`} value={values[DAYS[day]][slot.number!-1]} onChange={e=>{const text=e.target.value;setDraft(prev=>({...prev,[DAYS[day]]:prev[DAYS[day]].map((v,i)=>i===slot.number!-1?text:v)}));}}/>:<span className={values[DAYS[day]][slot.number!-1]?'':'empty-subject'}>{resolveLesson(values[DAYS[day]][slot.number!-1],school.teachers).subject||`Timeslot ${slot.number}`}<small className="row-teacher">{resolveLesson(values[DAYS[day]][slot.number!-1],school.teachers).teacher}</small></span>}</div><span className="row-status">{active?<span className="now-badge">Now</span>:past?<Check size={17} aria-label="Completed"/>:isUpcoming?<span className="next-badge">Next</span>:<span className="dash">—</span>}</span></div>;})}</div></div>
  <div className="end-marker"><span/><CheckCircle2 size={16}/><span>That’s the day · {endTime}</span><span/></div></section></>}</>}
  <footer><span><span className="footer-dot"/> Updates live · Surakarta time (WIB)</span><span>Made for your Monday through Friday.</span></footer>
  <p className="feedback" role="status">{message}</p></main></div>
  <dialog ref={dialog} className="install-dialog"><div className="dialog-heading"><h2>Take Dayline with you</h2><button aria-label="Close installation instructions" onClick={()=>dialog.current?.close()}><X size={20}/></button></div><p>Install it on your home screen for quick access. Your schedule works offline after your first visit.</p><p><strong>iPhone or iPad:</strong> open in Safari, tap Share, then “Add to Home Screen”.</p><p><strong>Android or desktop:</strong> open your browser menu and choose “Install app” or “Add to Home Screen” when available.</p><p className="dialog-note">School data is shared. Your class preference is saved in this browser.</p><button className="button primary" onClick={()=>dialog.current?.close()}>Got it</button></dialog>
 </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
