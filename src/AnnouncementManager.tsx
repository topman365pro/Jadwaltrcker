import { useState } from 'react';
import { CalendarClock, Trash2 } from 'lucide-react';
import { parseAnnouncement, unexpiredOverrides, type BellOverride } from './announcements';
import { formatTime, schoolClock, slotsForDate, SCHOOL_TIME_ZONE } from './schedule';
import type { School } from './school';

function dateLabel(date: string) {
 return new Date(`${date}T00:00:00+07:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: SCHOOL_TIME_ZONE });
}

export function AnnouncementManager({ school, now, onChange, disabled }: {
 school: School; now: Date; onChange: (school: School) => Promise<void>; disabled: boolean;
}) {
 const [text, setText] = useState('');
 const [preview, setPreview] = useState<BellOverride | null>(null);
 const [error, setError] = useState('');
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);
 const today = schoolClock(now).date;
 const overrides = unexpiredOverrides(school.bellOverrides, now);
 const replacing = preview && overrides.some(override => override.date === preview.date);
 const expired = preview && preview.date < today;
 function review() {
  setError(''); setMessage(''); setPreview(null);
  try { setPreview(parseAnnouncement(text)); }
  catch (error) { setError((error as Error).message); }
 }
 async function save(next: BellOverride[], success: string) {
  setBusy(true); setError(''); setMessage('');
  try {
   await onChange({ ...school, bellOverrides: next });
   setMessage(success); setPreview(null); setText('');
  } catch (error) { setError((error as Error).message); }
  finally { setBusy(false); }
 }
 return <div className="announcement-manager">
  <div className="announcement-heading"><CalendarClock size={20}/><h3>Temporary bell times</h3></div>
  <p className="data-description">Paste an INFO JAM KBM or INFO KURIKULUM announcement. Its date and numbered timeslots apply to every class; breaks come from the gaps between lessons. Lesson and teacher assignments stay the same.</p>
  <label htmlFor="announcement-text">School announcement</label>
  <textarea id="announcement-text" rows={7} maxLength={20000} value={text} disabled={disabled || busy} placeholder={'Rabu, 7 Oktober 2026\n1. 07.00 - 07.30\n2. 07.30 - 08.00\n…'} onChange={event => { setText(event.target.value); setPreview(null); setError(''); setMessage(''); }}/>
  <button className="button" disabled={disabled || busy || !text.trim()} onClick={review}>Preview announcement</button>
  {preview && <div className="announcement-preview">
   <h4>{dateLabel(preview.date)}</h4>
   <p className="data-description">{preview.periods.length} timeslots · All classes · WIB (Surakarta). The default schedule returns automatically at midnight after this date, including offline.</p>
   {replacing && <p className="data-warning">Applying replaces the temporary bell times already saved for this date.</p>}
   {expired && <p className="data-warning">This announcement’s date has passed. Paste an announcement for today or a future school day to apply it.</p>}
   <table className="announcement-table"><thead><tr><th scope="col">Slot</th><th scope="col">Time (WIB)</th></tr></thead><tbody>{slotsForDate(new Date(`${preview.date}T00:00:00+07:00`), [preview]).map(slot => <tr key={slot.id}><td>{slot.label}</td><td>{formatTime(slot.start)} – {formatTime(slot.end)}</td></tr>)}</tbody></table>
   <button className="button primary" disabled={disabled || busy || !!expired} onClick={() => void save([...overrides.filter(override => override.date !== preview.date), preview].sort((a, b) => a.date.localeCompare(b.date)), `Temporary bell times saved for ${dateLabel(preview.date)}.`)}>{busy ? 'Saving…' : 'Apply temporary bell times'}</button>
  </div>}
  {error && <p className="data-error" role="alert">{error}</p>}
  {message && <p className="data-description" role="status">{message}</p>}
  {overrides.length > 0 && <div className="announcement-saved"><h4>Saved announcements</h4>{overrides.map(override => <div className="announcement-saved-row" key={override.date}><div><strong>{dateLabel(override.date)}</strong><small>{override.date === today ? 'Active today' : 'Scheduled'} · {override.periods.length} timeslots · Expires at midnight WIB</small></div><button className="button" disabled={disabled || busy} aria-label={`Remove temporary bell times for ${dateLabel(override.date)}`} onClick={() => void save(overrides.filter(item => item.date !== override.date), 'Temporary bell times removed.')}><Trash2 size={15}/> Remove</button></div>)}</div>}
 </div>;
}
