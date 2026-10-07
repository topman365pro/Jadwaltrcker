import { DAYS, type Contents } from '../src/schedule.js';
import { validateTeachers, type Teacher } from '../src/teachers.js';
import { validateBellOverrides, type BellOverride } from '../src/announcements.js';
export type SharedSchool={teachers:Teacher[];classes:Record<string,Contents>;revision:number;bellOverrides?:BellOverride[]};
export class InputError extends Error {}
export function validateSharedSchool(value:unknown):SharedSchool {
 if(!value||typeof value!=='object')throw new InputError('Expected school data.');
 const v=value as Record<string,unknown>;
 if(!Number.isSafeInteger(v.revision)||Number(v.revision)<1)throw new InputError('A valid data revision is required.');
 if(!Array.isArray(v.teachers)||v.teachers.length>99||v.teachers.some(t=>!t||typeof t!=='object'||typeof t.code!=='string'||typeof t.teacher!=='string'||typeof t.subject!=='string'))throw new InputError('Invalid teacher list.');
 let teachers:Teacher[];try{teachers=validateTeachers(v.teachers,true);}catch(e){throw new InputError((e as Error).message);}
 if(!v.classes||typeof v.classes!=='object'||Array.isArray(v.classes))throw new InputError('Invalid timetable.');
 const entries=Object.entries(v.classes);if(entries.length<1||entries.length>100)throw new InputError('Use between 1 and 100 classes.');
 const classes:Record<string,Contents>={};
 for(const [name,raw] of entries){if(!name.trim()||name!==name.trim()||name.length>60||['__proto__','constructor','prototype'].includes(name)||!raw||typeof raw!=='object'||Array.isArray(raw))throw new InputError('Invalid class name or timetable.');
 const days=raw as Record<string,unknown>;const content:Contents={};
 for(const [i,day] of DAYS.entries()){const slots=days[day];if(!Array.isArray(slots)||slots.length!==10||slots.some(s=>typeof s!=='string'||s.length>200))throw new InputError(`${name}: ${day} requires ten text entries (Friday's final two must be blank).`);if(i===4&&slots.slice(8).some(Boolean))throw new InputError(`${name}: Friday ends at timeslot 8.`);content[day]=[...slots];}
 classes[name]=content;
 }
 let bellOverrides:BellOverride[]|undefined;
 if(v.bellOverrides!==undefined){try{bellOverrides=validateBellOverrides(v.bellOverrides);}catch(e){throw new InputError((e as Error).message);}}
 return {teachers,classes,revision:Number(v.revision),...(bellOverrides!==undefined?{bellOverrides}:{})};
}
