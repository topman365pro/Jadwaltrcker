import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { getSchool, saveSchool, ConflictError } from '../server/db.js';
import { validateSharedSchool, InputError } from '../server/validation.js';
export function authorized(header:string|undefined):boolean {const expected=process.env.ADMIN_TOKEN;if(!expected||!header?.startsWith('Bearer '))return false;const actual=Buffer.from(header.slice(7));const key=Buffer.from(expected);return actual.length===key.length&&timingSafeEqual(actual,key);}
async function requestBody(req:IncomingMessage&{body?:unknown}) {
 if(req.body!==undefined){if(typeof req.body==='string'){if(Buffer.byteLength(req.body)>1024*1024)throw new InputError('Request exceeds 1 MB.');try{return JSON.parse(req.body);}catch{throw new InputError('Invalid JSON.');}}if(Buffer.byteLength(JSON.stringify(req.body))>1024*1024)throw new InputError('Request exceeds 1 MB.');return req.body;}
 const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=b.length;if(size>1024*1024)throw new InputError('Request exceeds 1 MB.');chunks.push(b);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new InputError('Invalid JSON.');}
}
export default async function handler(req:IncomingMessage&{body?:unknown},res:ServerResponse){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status:number,body:unknown)=>{res.statusCode=status;res.end(JSON.stringify(body));};
 if(!['GET','PUT','POST'].includes(req.method||'')){res.setHeader('Allow','GET, PUT, POST');send(405,{error:'Method not allowed.'});return;}
 if(req.method!=='GET'&&!authorized(req.headers.authorization)){send(401,{error:'Enter a valid editing key to change shared school data.'});return;}
 if(req.method==='POST'){send(200,{authorized:true});return;}
 try{if(req.method==='GET'){send(200,await getSchool());return;}const value=validateSharedSchool(await requestBody(req));send(200,await saveSchool(value));}
 catch(e){if(e instanceof InputError){send(400,{error:e.message});return;}if(e instanceof ConflictError){send(409,{error:e.message});return;}console.error('School API failed.',{code:(e as {code?:string}).code||'DATABASE_ERROR'});send(503,{error:'Shared data is unavailable. Check the server database configuration or try again shortly.'});}
}
