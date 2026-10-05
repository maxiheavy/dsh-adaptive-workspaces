import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toolInputSchema} from '../server/tool-input.ts';
import {specSchema} from '../app/src/schema.ts';
test('accepts the exact Qwen object/string/double-string payload encodings from the failing session',()=>{
 for(const action of ['get_catalog','get_state','open_view','update_view']){
  const payload=action==='open_view'?{title:'Video Comparison'}:{};
  for(const encoded of [payload,JSON.stringify(payload),JSON.stringify(JSON.stringify(payload))])assert.deepEqual(toolInputSchema.parse({sessionId:'session-one',action,payload:encoded}).payload,payload);
 }
 assert.deepEqual(toolInputSchema.parse({sessionId:'session-one',action:'get_catalog'}).payload,{});
});
test('normalization does not repair or accept malformed payloads or invalid UI specs',()=>{
 for(const payload of ['{bad', 'null','[]','42',JSON.stringify(JSON.stringify(JSON.stringify({})))])assert.throws(()=>toolInputSchema.parse({sessionId:'session-one',action:'open_view',payload}));
 const v=toolInputSchema.parse({sessionId:'session-one',action:'open_view',payload:'{"title":"Video Comparison","spec":{"root":"root"}}'});
 assert.equal(specSchema.safeParse(v.payload.spec).success,false);
});
