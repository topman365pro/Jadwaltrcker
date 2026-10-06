import { read, utils, writeFile, type WorkBook, type WorkSheet } from 'xlsx';
import { DAYS, blankContents } from './schedule';
import { validateTeachers, type School, type Teacher } from './school';
const cellText=(value:unknown)=>String(value??'').trim();
function grid(sheet:WorkSheet):string[][] {
 const bounds=utils.decode_range(sheet['!ref']||'A1');if(bounds.e.r>3000||bounds.e.c>150)throw new Error('Sheet is too large. Use at most 3,000 rows and 150 columns.');
 const rows=utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',raw:true}).map(row=>row.map(cellText));
 for(const merge of sheet['!merges']||[])for(let r=merge.s.r;r<=merge.e.r;r++)for(let c=merge.s.c;c<=merge.e.c;c++){rows[r]??=[];rows[r][c]=rows[merge.s.r]?.[merge.s.c]||'';}
 return rows;
}
const dayNames:Record<string,string>={senin:'Monday',selasa:'Tuesday',rabu:'Wednesday',kamis:'Thursday',jumat:'Friday',"jum'at":'Friday',monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday'};
export function parseTimetable(book:WorkBook):School['classes'] {
 for(const name of book.SheetNames){const rows=grid(book.Sheets[name]);const header=rows.findIndex(row=>row.filter(c=>/^X(?:I|II)?[.\s-]\d{1,2}$/i.test(c)).length>0);if(header<0)continue;
 const columns=rows[header].map((label,col)=>({label,col})).filter(c=>/^X(?:I|II)?[.\s-]\d{1,2}$/i.test(c.label));const classes:School['classes']={};for(const c of columns){if(classes[c.label])throw new Error(`Duplicate class ${c.label}.`);classes[c.label]=blankContents();}
 const firstCol=Math.min(...columns.map(c=>c.col));const found=new Set<string>();let day='';
 for(let r=header+1;r<rows.length;r++){const row=rows[r];for(let c=0;c<firstCol;c++){const d=dayNames[(row[c]||'').toLowerCase()];if(d)day=d;}
 if(!day)continue;const numberText=row[firstCol-1]||'';if(!/^\d+$/.test(numberText))continue;const slot=Number(numberText);if(slot<1||slot>(day==='Friday'?8:10))continue;const key=`${day}-${slot}`;if(found.has(key))throw new Error(`Duplicate ${day} timeslot ${slot}.`);found.add(key);
 for(const {label,col} of columns)classes[label][day][slot-1]=cellText(row[col]);
 }
 for(const [i,d] of DAYS.entries())for(let s=1;s<=(i===4?8:10);s++)if(!found.has(`${d}-${s}`))throw new Error(`Missing ${d} timeslot ${s}. Check the HARI and JAM KE columns.`);
 return classes;
 }throw new Error('No timetable found. Use the school layout with HARI, JAM KE, and class headers such as X.1, XI.1, or XII.1.');
}
function headerKey(s:string){return s.toLowerCase().replace(/[\s._-]/g,'');}
export function parseTeacherWorkbook(book:WorkBook):Teacher[] {
 for(const name of book.SheetNames){const rows=grid(book.Sheets[name]);for(let r=0;r<Math.min(rows.length,100);r++){const keys=rows[r].map(headerKey);const find=(aliases:string[])=>keys.findIndex(k=>aliases.includes(k));const code=find(['code','kode','kodeguru']),teacher=find(['teacher','namaguru','guru','teachername']),subject=find(['subject','matapelajaran','mapel']);if(code<0||teacher<0||subject<0)continue;
 const list:Teacher[]=[];for(const row of rows.slice(r+1)){if(![row[code],row[teacher],row[subject]].some(Boolean))continue;list.push({code:row[code]||'',teacher:row[teacher]||'',subject:row[subject]||''});}return validateTeachers(list);
 }}throw new Error('Teacher sheet needs columns: Code, Teacher, Subject (or Kode, Nama Guru, Mata Pelajaran).');
}
export async function readUpload(file:File):Promise<WorkBook>{if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw new Error('Choose an .xlsx, .xls, or .csv spreadsheet.');if(file.size>10*1024*1024)throw new Error('Choose a spreadsheet smaller than 10 MB.');return read(await file.arrayBuffer(),{type:'array',cellFormula:false,cellHTML:false,cellDates:false});}
export function downloadTeachers(teachers:Teacher[]) {const book=utils.book_new();utils.book_append_sheet(book,utils.aoa_to_sheet([['Code','Teacher','Subject'],...teachers.map(t=>[t.code,t.teacher,t.subject])]),'Teachers');writeFile(book,'Dayline_Teachers.xlsx');}
