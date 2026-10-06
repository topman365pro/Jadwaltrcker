import { useCallback, useEffect, useState } from 'react';
import { blankContents, DAYS } from './schedule';
import { validateTeachers, type School } from './school';
export const CLASS_KEY='dayline-selected-class';
export const CACHE_KEY='dayline-shared-cache-v1';
export const EDIT_KEY='dayline-editing-key';
export type Snapshot=Omit<School,'selectedClass'>&{revision:number};
function preference(){try{const current=localStorage.getItem(CLASS_KEY);if(current)return current;const legacy=JSON.parse(localStorage.getItem('dayline-school-v2')||'null');return typeof legacy?.selectedClass==='string'?legacy.selectedClass:'';}catch{return '';}}
function cached():Snapshot|null{try{const v=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(!v||!Number.isSafeInteger(v.revision)||!v.classes||!Object.keys(v.classes).length)return null;validateTeachers(v.teachers,true);for(const c of Object.values(v.classes) as Record<string,unknown>[])for(const d of DAYS)if(!Array.isArray(c[d])||(c[d] as unknown[]).length!==10)return null;return v;}catch{return null;}}
export function getEditingKey(){try{return sessionStorage.getItem(EDIT_KEY)||'';}catch{return '';}}
export async function unlockEditing(key:string){const response=await fetch('/api/school',{method:'POST',headers:{Authorization:`Bearer ${key}`}});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not verify the editing key.');try{sessionStorage.setItem(EDIT_KEY,key);}catch{/* Key can remain in memory for this page. */}return key;}
function schoolFrom(data:Snapshot|null,selected=preference()):School {if(!data)return {teachers:[],classes:{},selectedClass:''};return {teachers:data.teachers,classes:data.classes,selectedClass:data.classes[selected]?selected:Object.keys(data.classes)[0]};}
export function useSharedSchool(){
 const [cache]=useState(cached);const [school,setSchool]=useState<School>(()=>schoolFrom(cache));const [revision,setRevision]=useState(cache?.revision??0);
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [cachedMode,setCachedMode]=useState(!!cache);const [error,setError]=useState('');
 const accept=useCallback((data:Snapshot)=>{setSchool(previous=>schoolFrom(data,previous.selectedClass||preference()));setRevision(data.revision);setCachedMode(false);setError('');try{localStorage.setItem(CACHE_KEY,JSON.stringify(data));}catch{/* Dashboard still works without storage. */}},[]);
 const refresh=useCallback(async()=>{setLoading(true);try{const response=await fetch('/api/school',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load the timetable.');accept(data);}catch(e){setCachedMode(true);setError(e instanceof Error?e.message:'Could not load shared data.');}finally{setLoading(false);}},[accept]);
 useEffect(()=>{void refresh();},[refresh]);
 function selectClass(name:string){if(!school.classes[name])return;setSchool(prev=>({...prev,selectedClass:name}));try{localStorage.setItem(CLASS_KEY,name);}catch{/* Keep selection for this session. */}}
 async function save(next:School,key:string){if(saving)throw new Error('A save is already in progress.');if(cachedMode||!revision)throw new Error('Reconnect and reload shared data before editing.');setSaving(true);try{const response=await fetch('/api/school',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({teachers:next.teachers,classes:next.classes,revision})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save shared data.');accept(data);if(next.selectedClass!==school.selectedClass){setSchool(schoolFrom(data,next.selectedClass));try{localStorage.setItem(CLASS_KEY,next.selectedClass);}catch{/* Optional preference. */}}}finally{setSaving(false);}}
 return {school,contents:school.classes[school.selectedClass]||blankContents(),hasData:Object.keys(school.classes).length>0,loading,saving,cachedMode,error,refresh,selectClass,save};
}
