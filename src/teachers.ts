// Pure validation shared with the server: no browser, seed-data, or JSON imports.
export type Teacher = { code: string; teacher: string; subject: string };
export function normalizeCode(value: unknown): string {
 const s=String(value??'').trim(); if(!/^\d{1,2}$/.test(s)||Number(s)<1) throw new Error(`Invalid teacher code “${s}”. Use 01–99.`);
 return s.padStart(2,'0');
}
export function validateTeachers(rows:Teacher[],allowEmpty=false):Teacher[] {
 if(!rows.length&&!allowEmpty)throw new Error('No teacher rows found.');const seen=new Set<string>();return rows.map((row,i)=>{const code=normalizeCode(row.code);if(seen.has(code))throw new Error(`Duplicate teacher code ${code}. Each code needs a single teacher and subject.`);seen.add(code);const teacher=String(row.teacher??'').trim(),subject=String(row.subject??'').trim();if(!teacher||!subject)throw new Error(`Row ${i+1}: teacher and subject are required.`);if(teacher.length>200||subject.length>200)throw new Error(`Row ${i+1}: names must be at most 200 characters.`);return {code,teacher,subject};}).sort((a,b)=>a.code.localeCompare(b.code));
}
