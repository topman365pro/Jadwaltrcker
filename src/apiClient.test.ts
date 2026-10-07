import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readApiResponse, parseSnapshot, requestSchool } from './apiClient';
import { initialSchool } from './school';
import { parseAnnouncement } from './announcements';
test('loads temporary bell schedules into the offline snapshot and rejects malformed overrides',()=>{
 const expected={...structuredClone(initialSchool),revision:1,bellOverrides:[parseAnnouncement('7 Oktober 2026\n1. 07.00 - 07.30')]};
 assert.deepEqual(parseSnapshot(expected).bellOverrides,expected.bellOverrides);
 assert.deepEqual(parseSnapshot({...expected,bellOverrides:undefined}).bellOverrides,[]);
 assert.throws(()=>parseSnapshot({...expected,bellOverrides:[{date:'invalid',periods:[]}]}),/incomplete timetable/);
});
test('plain-text function crashes produce a clear error instead of a browser parser exception',async()=>{await assert.rejects(readApiResponse(new Response('FUNCTION_INVOCATION_FAILED',{status:500})),/schedule server could not start/);const safariResponse=new Response('',{status:500});safariResponse.json=async()=>{throw new SyntaxError('The string did not match the expected pattern.');};await assert.rejects(readApiResponse(safariResponse),/schedule server could not start/);});
test('HTML or empty successful API responses are rejected safely',async()=>{for(const body of ['<html>Not the API</html>',''])await assert.rejects(readApiResponse(new Response(body)),/unreadable response/);});
test('preserves actionable JSON errors from server responses',async()=>{await assert.rejects(readApiResponse(Response.json({error:'Reload latest data before saving.'},{status:409})),/Reload latest/);});
test('validates loaded data before updating the dashboard or offline cache',()=>{const expected={...structuredClone(initialSchool),revision:3};assert.equal(parseSnapshot(expected).revision,3);for(const value of [null,{}, {authorized:true},{...expected,classes:{}},{...expected,revision:0}])assert.throws(()=>parseSnapshot(value),/incomplete timetable/);const broken=structuredClone(expected);broken.classes['X.1'].Monday[0]=null as unknown as string;assert.throws(()=>parseSnapshot(broken),/incomplete timetable/);});
test('network errors are translated instead of exposing browser-specific exceptions',async()=>{const original=globalThis.fetch;try{globalThis.fetch=async()=>{throw new TypeError('The string did not match the expected pattern.');};await assert.rejects(requestSchool(),/Unable to reach the schedule server/);}finally{globalThis.fetch=original;}});
