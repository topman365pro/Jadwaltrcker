import pg, { type PoolClient } from 'pg';
import { DAYS, blankContents } from '../src/schedule.js';
import type { SharedSchool } from './validation.js';
import { unexpiredOverrides } from '../src/announcements.js';
let pool:pg.Pool|undefined;
export function database(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured.');const url=new URL(process.env.DATABASE_URL);if(url.searchParams.get('sslmode')==='require')url.searchParams.set('sslmode','verify-full');if(!pool){pool=new pg.Pool({connectionString:url.toString(),max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,query_timeout:15000,allowExitOnIdle:true});pool.on('error',error=>console.error('Idle database connection failed.',{code:(error as {code?:string}).code||'DATABASE_ERROR'}));}return pool;}
export async function closeDatabase(){await pool?.end();pool=undefined;}
export class ConflictError extends Error {}
export async function getSchool():Promise<SharedSchool>{
 const client=await database().connect();
 try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const meta=await client.query('SELECT revision, bell_overrides FROM dayline_meta WHERE id=1');if(!meta.rowCount)throw new Error('School data has not been migrated.');
 const teachers=await client.query('SELECT code, teacher, subject FROM dayline_teachers ORDER BY code');
 const names=await client.query('SELECT name FROM dayline_classes ORDER BY name');
 const entries=await client.query('SELECT class_name, weekday, slot, entry FROM dayline_timetable ORDER BY class_name, weekday, slot');
 const classes:SharedSchool['classes']={};for(const row of names.rows)classes[row.name]=blankContents();for(const row of entries.rows)classes[row.class_name][DAYS[row.weekday-1]][row.slot-1]=row.entry;
 await client.query('COMMIT');return {teachers:teachers.rows,classes,bellOverrides:unexpiredOverrides(meta.rows[0].bell_overrides),revision:meta.rows[0].revision};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function writeRows(client:PoolClient,data:Pick<SharedSchool,'teachers'|'classes'>){
 // Parameterized bulk writes keep imports fast on a pooled remote connection.
 await client.query('INSERT INTO dayline_teachers(code,teacher,subject) SELECT code,teacher,subject FROM jsonb_to_recordset($1::jsonb) AS x(code text,teacher text,subject text)',[JSON.stringify(data.teachers)]);
 await client.query('INSERT INTO dayline_classes(name) SELECT jsonb_array_elements_text($1::jsonb)',[JSON.stringify(Object.keys(data.classes))]);
 const entries=Object.entries(data.classes).flatMap(([name,c])=>DAYS.flatMap((d,i)=>c[d].slice(0,i===4?8:10).map((entry,s)=>({class_name:name,weekday:i+1,slot:s+1,entry}))));
 await client.query('INSERT INTO dayline_timetable(class_name,weekday,slot,entry) SELECT class_name,weekday,slot,entry FROM jsonb_to_recordset($1::jsonb) AS x(class_name text,weekday smallint,slot smallint,entry text)',[JSON.stringify(entries)]);
}
export async function saveSchool(data:SharedSchool):Promise<SharedSchool>{
 const client=await database().connect();try{await client.query('BEGIN');
 const meta=await client.query('SELECT revision, bell_overrides FROM dayline_meta WHERE id=1 FOR UPDATE');if(meta.rows[0]?.revision!==data.revision)throw new ConflictError('The shared timetable changed. Reload the latest data before saving again.');
 await client.query('DELETE FROM dayline_timetable');await client.query('DELETE FROM dayline_classes');await client.query('DELETE FROM dayline_teachers');await writeRows(client,data);
 const bellOverrides=unexpiredOverrides(data.bellOverrides??meta.rows[0].bell_overrides);
 const updated=await client.query('UPDATE dayline_meta SET bell_overrides=$1::jsonb,revision=revision+1,updated_at=now() WHERE id=1 RETURNING revision',[JSON.stringify(bellOverrides)]);await client.query('COMMIT');return {...data,bellOverrides,revision:updated.rows[0].revision};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
