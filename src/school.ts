import initial from './data/initial-school.json';
import { DAYS, parseContents, type Contents } from './schedule';
import { normalizeCode, validateTeachers, type Teacher } from './teachers';
export { normalizeCode, validateTeachers, type Teacher } from './teachers';
export type School = { teachers: Teacher[]; classes: Record<string, Contents>; selectedClass: string };
export const SCHOOL_KEY = 'dayline-school-v2';
export const initialSchool = initial as School;
export function codesIn(value:string):string[] {const s=value.trim();return /^\d{1,2}(?:\s*[,;/&]\s*\d{1,2})*$/.test(s)?s.split(/[,;/&]/).map(v=>String(Number(v.trim())).padStart(2,'0')):[];}
export function resolveLesson(value:string,teachers:Teacher[]) {
 const codes=codesIn(value);if(!codes.length)return {subject:value,teacher:'',codes:[]};
 const matches=codes.map(code=>teachers.find(t=>t.code===code));
 return {subject:matches.map((t,i)=>t?.subject||`Unknown code ${codes[i]}`).join(' / '),teacher:matches.map((t,i)=>t?.teacher||`Teacher ${codes[i]} needs a mapping`).join(' / '),codes};
}
export function unknownCodes(classes:School['classes'],teachers:Teacher[]) {return [...new Set(Object.values(classes).flatMap(c=>DAYS.flatMap((d,i)=>c[d].slice(0,i===4?8:10).flatMap(codesIn))))].filter(code=>!teachers.some(t=>t.code===code)).sort();}
export function restoreSchool(raw:string|null):School {
 if(!raw)return structuredClone(initialSchool);
 try {const v=JSON.parse(raw);if(!v||!Array.isArray(v.teachers)||!v.classes||typeof v.classes!=='object')throw Error();
 const teachers=validateTeachers(v.teachers,true);const classes:School['classes']={};for(const [name,content] of Object.entries(v.classes)){if(!name.trim()||name.length>60)continue;classes[name]=parseContents(JSON.stringify(content));}
 const names=Object.keys(classes);if(!names.length)throw Error();return {teachers,classes,selectedClass:names.includes(v.selectedClass)?v.selectedClass:names[0]};
 }catch{return structuredClone(initialSchool);}
}
