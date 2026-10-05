import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { z } from 'zod';
const title=z.string().min(1).max(120);
const field=z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/);
export const components={
 Workspace:{props:z.object({title}).strict(),slots:['default'],description:'Root of a task-specific work view. Children are panels.'},
 Text:{props:z.object({title,body:z.string().max(12000)}).strict(),description:'Briefs, explanations, research notes, or instructions. Plain text.'},
 Metric:{props:z.object({title,value:z.string().max(120),detail:z.string().max(500).optional()}).strict(),description:'A key result or measurement with an optional explanation.'},
 Table:{props:z.object({title,columns:z.array(z.string().max(120)).min(1).max(12),rows:z.array(z.array(z.string().max(2000)).max(12)).max(100)}).strict(),description:'Compare options, display evidence, project lists, or structured results.'},
 Checklist:{props:z.object({title,field,items:z.array(z.object({id:field,label:z.string().max(500)}).strict()).max(50)}).strict(),description:'Interactive checklist. Checked IDs persist in state.fields[field].'},
 Input:{props:z.object({title,field,placeholder:z.string().max(200).optional(),multiline:z.boolean().optional()}).strict(),description:'Collect user text in state.fields[field].'},
 Select:{props:z.object({title,field,options:z.array(z.string().max(200)).min(1).max(50)}).strict(),description:'Collect a user choice in state.fields[field].'},
 BarChart:{props:z.object({title,items:z.array(z.object({label:z.string().max(120),value:z.number().finite().nonnegative()}).strict()).min(1).max(30)}).strict(),description:'Compare nonnegative numeric values in a simple bar chart.'},
};
export const catalog=defineCatalog(schema,{components,actions:{}});
const names=Object.keys(components) as [keyof typeof components,...(keyof typeof components)[]];
export const specSchema=z.object({root:z.string().min(1),elements:z.record(z.string(),z.object({type:z.enum(names),props:z.record(z.string(),z.unknown()),children:z.array(z.string()).max(24).optional()}).strict())}).strict().superRefine((s,ctx)=>{
 const fail=(message:string)=>ctx.addIssue({code:'custom',message});
 if(Object.keys(s.elements).length>25)fail('Maximum 24 panels plus root');
 if(s.elements[s.root]?.type!=='Workspace')fail('Root must be Workspace');
 const visited=new Set<string>();
 const fields=new Set<string>();
 function visit(id:string){
  if(visited.has(id)){fail('Cycles and shared children are not allowed');return;} visited.add(id);
  const e=s.elements[id];if(!e){fail('Missing element '+id);return;}
  if(!components[e.type].props.safeParse(e.props).success)fail('Invalid props: '+id);
  if(e.type!=='Workspace'&&e.children?.length)fail('Only Workspace accepts children');
  if(id!==s.root&&e.type==='Workspace')fail('Only one root Workspace is allowed');
  if(typeof e.props.field==='string'){if(fields.has(e.props.field))fail('Duplicate input field');fields.add(e.props.field);}
  if(e.type==='Table'&&Array.isArray(e.props.rows)&&Array.isArray(e.props.columns)&&e.props.rows.some((row)=>Array.isArray(row)&&row.length!==(e.props.columns as unknown[]).length))fail('Table rows must match columns');
  for(const child of e.children??[])visit(child);
 }
 visit(s.root);if(visited.size!==Object.keys(s.elements).length)fail('Unreachable elements');
});
export type WorkSpec=z.infer<typeof specSchema>;
export const fieldValuesSchema=z.record(field,z.union([z.string().max(12000),z.array(z.string().max(200)).max(50)]));
export type FieldValues=z.infer<typeof fieldValuesSchema>;
export interface View {id:string;title:string;spec:WorkSpec;fields:FieldValues;revision:number}
export interface Workspace {sessionId:string;activeView?:string;opened:number;views:View[]}
export function defaultSpec(title:string):WorkSpec{return {root:'root',elements:{root:{type:'Workspace',props:{title},children:['brief']},brief:{type:'Text',props:{title:'Work brief',body:'Describe the task in the conversation. The assistant can adapt this view to the work.'}}}};}
export function catalogDescription(){return Object.fromEntries(Object.entries(components).map(([name,c])=>[name,{description:c.description,props:z.toJSONSchema(c.props)}]));}
