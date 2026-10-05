import { existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,openSync,fsyncSync,closeSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { specSchema,defaultSpec,catalogDescription,fieldValuesSchema,type Workspace } from '../app/src/schema.ts';
const dir=process.env.ADAPTIVE_WORKSPACE_DATA_DIR;
if(!dir)throw new Error('ADAPTIVE_WORKSPACE_DATA_DIR is required');
mkdirSync(dir,{recursive:true,mode:0o700});const file=join(dir,'workspaces.json');
const workspaceSchema=z.object({sessionId:z.string(),activeView:z.string().optional(),opened:z.number().int(),views:z.array(z.object({id:z.string(),title:z.string(),spec:specSchema,fields:fieldValuesSchema,revision:z.number().int()}))});
const states:Workspace[]=existsSync(file)?z.array(workspaceSchema).parse(JSON.parse(readFileSync(file,'utf8'))):[];
function save(){const tmp=file+'.pending';writeFileSync(tmp,JSON.stringify(states),{mode:0o600});const fd=openSync(tmp,'r');try{fsyncSync(fd);}finally{closeSync(fd);}renameSync(tmp,file);const dd=openSync(dir!,'r');try{fsyncSync(dd);}finally{closeSync(dd);}}
export function state(sessionId:string){let s=states.find(s=>s.sessionId===sessionId);if(!s){s={sessionId,opened:0,views:[]};states.push(s);save();}return s;}
export function action(sessionId:string,name:string,input:unknown){
 if(name==='get_catalog')return {components:catalogDescription(),format:'{root:"root",elements:{root:{type:"Workspace",props:{title:"Title"},children:["panel"]},panel:{type:"Text",props:{title:"Brief",body:"Text"}}}}',rules:'One Workspace root, up to 24 panels. No HTML, scripts, URLs or executable handlers. Input/Select/Checklist values persist by field key. Read get_state to see user changes. Adapt the view to the task; do not assume a specific skill or domain.'};
 const s=state(sessionId);
 if(name==='get_state')return s;
 if(name==='open_view'){
  const a=z.object({title:z.string().min(1).max(120),spec:specSchema.optional()}).strict().parse(input);
  const v={id:randomUUID(),title:a.title,spec:a.spec??defaultSpec(a.title),fields:{},revision:0};s.views.push(v);s.activeView=v.id;s.opened++;save();return v;
 }
 if(name==='update_view'){
  const a=z.object({viewId:z.string(),revision:z.number().int(),title:z.string().min(1).max(120).optional(),spec:specSchema}).strict().parse(input);
  const v=s.views.find(v=>v.id===a.viewId);if(!v)throw new Error('View not found');if(v.revision!==a.revision)throw new Error('View changed; read get_state before updating');
  v.spec=a.spec;if(a.title)v.title=a.title;v.revision++;s.activeView=v.id;s.opened++;save();return v;
 }
 throw new Error('Unknown workspace action');
}
export function edit(sessionId:string,input:unknown){
 const a=z.object({viewId:z.string(),revision:z.number().int(),fields:fieldValuesSchema.optional(),activate:z.boolean().optional()}).strict().parse(input);
 const s=state(sessionId),v=s.views.find(v=>v.id===a.viewId);if(!v)throw new Error('View not found');if(v.revision!==a.revision)throw new Error('View changed; reload before editing');
 if(a.fields)v.fields={...v.fields,...a.fields};if(a.activate)s.activeView=v.id;v.revision++;save();return s;
}
