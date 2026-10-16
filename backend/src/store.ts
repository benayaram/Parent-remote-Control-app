import mongoose from 'mongoose';
export type Row = { id: string; familyId?: string; [key: string]: any };
export const collections = ['users','families','family_memberships','children','devices','pairing_sessions','device_capabilities','policies','usage_summaries','geofences','location_samples','commands','command_acknowledgements','alerts','audit_events','deletion_requests','nonces','time_requests','invitations'] as const;
export type Collection = typeof collections[number];
export interface Store {
 get(c: Collection,id:string): Promise<Row|undefined>;
 find(c:Collection, query:Record<string,unknown>):Promise<Row[]>;
 put(c:Collection,row:Row):Promise<void>;
 remove(c:Collection,id:string):Promise<void>;
 transaction<T>(fn:(s:Store)=>Promise<T>):Promise<T>;
}
export class MemoryStore implements Store {
 rows = new Map<Collection,Map<string,Row>>(); private tail:Promise<any> = Promise.resolve();
 async get(c:Collection,id:string){const r=this.rows.get(c)?.get(id);return r?structuredClone(r):undefined;}
 async find(c:Collection,q:Record<string,unknown>){return [...(this.rows.get(c)?.values()??[])].filter(r=>Object.entries(q).every(([k,v])=>r[k]===v)).map(r=>structuredClone(r));}
 async put(c:Collection,r:Row){if(!this.rows.has(c))this.rows.set(c,new Map());this.rows.get(c)!.set(r.id,structuredClone(r));}
 async remove(c:Collection,id:string){this.rows.get(c)?.delete(id);}
 async transaction<T>(fn:(s:Store)=>Promise<T>):Promise<T>{
  const run=this.tail.then(async()=>{const backup=structuredClone(this.rows);try{return await fn(this);}catch(e){this.rows=backup;throw e;}});
  this.tail=run.catch(()=>{});return run;
 }
}
// Explicit collection names, unique primary identity and TTL expiry indexes. Flexible
// payloads are validated by Zod before writes. Transactions require a replica set.
export async function mongoStore(uri:string):Promise<Store>{
 await mongoose.connect(uri,{serverSelectionTimeoutMS:10000});
 const models = Object.fromEntries(collections.map(c=>{
  const schema=new mongoose.Schema({id:{type:String,required:true,unique:true},familyId:{type:String,index:true},expiresAt:{type:Date}}, {strict:false,versionKey:false,collection:c});
  if(['pairing_sessions','location_samples','usage_summaries','nonces','invitations'].includes(c))schema.index({expiresAt:1},{expireAfterSeconds:0});
  if(c==='commands')schema.index({deviceId:1,idempotencyKey:1},{unique:true});
  if(c==='family_memberships')schema.index({familyId:1,uid:1},{unique:true});
  if(c==='usage_summaries')schema.index({deviceId:1,localDate:1,packageName:1},{unique:true});
  return [c,mongoose.model(c,schema)];
 }));
 await Promise.all(Object.values(models).map(m=>m.init()));
 const wrap=(session?:mongoose.ClientSession):Store=>({
  async get(c,id){return (await models[c].findOne({id},null,{session}).lean()) as Row|undefined??undefined;},
  async find(c,q){return await models[c].find(q,null,{session}).limit(2000).lean() as Row[];},
  async put(c,r){await models[c].replaceOne({id:r.id},r,{upsert:true,session});},
  async remove(c,id){await models[c].deleteOne({id},{session});},
  async transaction(fn){if(session)return fn(wrap(session));const s=await mongoose.startSession();try{return await s.withTransaction(()=>fn(wrap(s))) as any;}finally{await s.endSession();}}
 });return wrap();
}
