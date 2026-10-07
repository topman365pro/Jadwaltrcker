import { useCallback, useEffect, useState } from 'react';
import { blankContents } from './schedule';
import { type School } from './school';
import { parseSnapshot, requestSchool } from './apiClient';
export const CLASS_KEY='dayline-selected-class';
export const CACHE_KEY='dayline-shared-cache-v1';
export const EDIT_KEY='dayline-editing-key';
export type Snapshot=Omit<School,'selectedClass'>&{revision:number};
function preference(){try{const current=localStorage.getItem(CLASS_KEY);if(current)return current;const legacy=JSON.parse(localStorage.getItem('dayline-school-v2')||'null');return typeof legacy?.selectedClass==='string'?legacy.selectedClass:'';}catch{return '';}}
function cached():Snapshot|null{try{return parseSnapshot(JSON.parse(localStorage.getItem(CACHE_KEY)||'null'));}catch{return null;}}
export function getEditingKey(){try{return sessionStorage.getItem(EDIT_KEY)||'';}catch{return '';}}
export async function unlockEditing(key:string){const result=await requestSchool({method:'POST',headers:{Authorization:`Bearer ${key}`}});if(!result||typeof result!=='object'||(result as {authorized?:boolean}).authorized!==true)throw new Error('Could not verify the editing key.');try{sessionStorage.setItem(EDIT_KEY,key);}catch{/* Key can remain in memory for this page. */}return key;}
function schoolFrom(data:Snapshot|null,selected=preference()):School {if(!data)return {teachers:[],classes:{},selectedClass:''};return {teachers:data.teachers,classes:data.classes,bellOverrides:data.bellOverrides||[],selectedClass:data.classes[selected]?selected:Object.keys(data.classes)[0]};}
export function useSharedSchool(){
 const [cache]=useState(cached);const [school,setSchool]=useState<School>(()=>schoolFrom(cache));const [revision,setRevision]=useState(cache?.revision??0);
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [cachedMode,setCachedMode]=useState(!!cache);const [error,setError]=useState('');
 const accept=useCallback((data:Snapshot)=>{setSchool(previous=>schoolFrom(data,previous.selectedClass||preference()));setRevision(data.revision);setCachedMode(false);setError('');try{localStorage.setItem(CACHE_KEY,JSON.stringify(data));}catch{/* Dashboard still works without storage. */}},[]);
 const refresh=useCallback(async()=>{setLoading(true);try{const data=parseSnapshot(await requestSchool({cache:'no-store'}));accept(data);}catch(e){setCachedMode(true);setError(e instanceof Error?e.message:'Could not load shared data.');}finally{setLoading(false);}},[accept]);
 useEffect(()=>{void refresh();},[refresh]);
 function selectClass(name:string){if(!school.classes[name])return;setSchool(prev=>({...prev,selectedClass:name}));try{localStorage.setItem(CLASS_KEY,name);}catch{/* Keep selection for this session. */}}
 async function save(next:School,key:string){if(saving)throw new Error('A save is already in progress.');if(cachedMode||!revision)throw new Error('Reconnect and reload shared data before editing.');setSaving(true);try{const data=parseSnapshot(await requestSchool({method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({teachers:next.teachers,classes:next.classes,bellOverrides:next.bellOverrides||[],revision})}));accept(data);if(next.selectedClass!==school.selectedClass){setSchool(schoolFrom(data,next.selectedClass));try{localStorage.setItem(CLASS_KEY,next.selectedClass);}catch{/* Optional preference. */}}}finally{setSaving(false);}}
 return {school,contents:school.classes[school.selectedClass]||blankContents(),hasData:Object.keys(school.classes).length>0,loading,saving,cachedMode,error,refresh,selectClass,save};
}
