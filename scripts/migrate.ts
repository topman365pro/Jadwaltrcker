import { readFile } from 'node:fs/promises';
import { database, closeDatabase, writeRows } from '../server/db.js';
try{process.loadEnvFile('.env');}catch{/* Deployed environments supply variables directly. */}
try{
 const client=await database().connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(73619428)');
 await client.query(await readFile(new URL('../migrations/001_school.sql',import.meta.url),'utf8'));
 await client.query(await readFile(new URL('../migrations/002_bell_overrides.sql',import.meta.url),'utf8'));
 const seeded=await client.query('SELECT id FROM dayline_meta WHERE id=1');
 if(!seeded.rowCount){const initial=JSON.parse(await readFile(new URL('../src/data/initial-school.json',import.meta.url),'utf8'));await writeRows(client,initial);await client.query('INSERT INTO dayline_meta(id) VALUES(1)');console.log(`Migrated ${initial.teachers.length} teachers and ${Object.keys(initial.classes).length} classes.`);}else console.log('Migration already applied. Existing school data preserved.');
 await client.query('COMMIT');const counts=await client.query('SELECT (SELECT count(*) FROM dayline_teachers) AS teachers,(SELECT count(*) FROM dayline_classes) AS classes,(SELECT count(*) FROM dayline_timetable) AS entries');console.log('Database verified:',counts.rows[0]);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}catch(e){console.error('Migration failed:',{code:(e as {code?:string}).code||'CONNECTION_ERROR'});process.exitCode=1;}finally{await closeDatabase();}
