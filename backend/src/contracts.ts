import {z} from 'zod';
export const resultStates=['applied','unsupported','permission_required','failed'] as const;
export const policySchema=z.object({
 timezone:z.string().refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}}),
 dailyMinutes:z.number().int().min(15).max(1440),
 appRules:z.array(z.object({packageName:z.string().min(3).max(200),dailyMinutes:z.number().int().min(0).max(1440)}).strict()).max(100),
 studyWindows:z.array(z.object({days:z.array(z.number().int().min(1).max(7)).max(7),start:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),end:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}).strict()).max(30),
 bedtimeWindows:z.array(z.object({days:z.array(z.number().int().min(1).max(7)).max(7),start:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),end:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}).strict()).max(30),
 webRules:z.object({deny:z.array(z.string().max(253)).max(200),allow:z.array(z.string().max(253)).max(200)}).strict()
}).strict();
export const commandSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('lock'),payload:z.object({}).strict(),idempotencyKey:z.string().uuid()}).strict(),
 z.object({type:z.literal('sync_policy'),payload:z.object({}).strict(),idempotencyKey:z.string().uuid()}).strict()
]);
export function domainBlocked(domain:string,deny:string[],allow:string[]){
 const normal=(s:string)=>s.toLowerCase().replace(/\.$/,'');const d=normal(domain);
 const match=(s:string)=>d===normal(s)||d.endsWith('.'+normal(s));
 return !allow.some(match)&&deny.some(match);
}
