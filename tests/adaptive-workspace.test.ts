import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {specSchema,type View} from '../app/src/schema.ts';
const dir=mkdtempSync(join(tmpdir(),'adaptive-'));
process.env.ADAPTIVE_WORKSPACE_DATA_DIR=dir;
const {action,state,edit}=await import('../server/store.ts');
const spec={root:'root',elements:{root:{type:'Workspace',props:{title:'Research review'},children:['comparison','decision']},comparison:{type:'Table',props:{title:'Options',columns:['Option','Evidence'],rows:[['A','Source one'],['B','Source two']]}},decision:{type:'Input',props:{title:'Decision',field:'decision'}}}};
test('a non-video task creates a view, retains user input through adaptation, and isolates sessions',()=>{
 try{
 const view=action('one','open_view',{title:'Research review',spec}) as View;
 edit('one',{viewId:view.id,revision:0,fields:{decision:'Investigate B'}});
 assert.throws(()=>action('one','update_view',{viewId:view.id,revision:0,spec}),/changed/);
 action('one','update_view',{viewId:view.id,revision:1,title:'Decision review',spec});
 assert.equal(state('one').views[0].fields.decision,'Investigate B');assert.equal(state('one').views[0].revision,2);
 assert.equal(state('two').views.length,0);
 const saved=JSON.parse(readFileSync(join(dir,'workspaces.json'),'utf8'));assert.equal(saved[0].views[0].fields.decision,'Investigate B');
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('catalog rejects executable and malformed view trees',()=>{
 assert.equal(specSchema.safeParse(spec).success,true);
 for(const bad of [
  {...spec,elements:{root:{type:'iframe',props:{src:'https://example.com'}}}},
  {...spec,elements:{root:{type:'Workspace',props:{title:'x'},children:['root']}}},
  {...spec,elements:{...spec.elements,comparison:{type:'Table',props:{title:'Options',columns:['A'],rows:[['one','two']]}}}},
  {...spec,elements:{...spec.elements,decision:{type:'Input',props:{title:'Decision',field:'decision',onClick:'alert(1)'}}}},
 ])assert.equal(specSchema.safeParse(bad).success,false);
});
