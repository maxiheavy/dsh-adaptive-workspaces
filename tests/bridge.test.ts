import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('packaged bridge authenticates host operations and persists interactive state',async()=>{
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const address=socket.address();assert(address&&typeof address==='object');const port=address.port;await new Promise<void>(r=>socket.close(()=>r()));
 const dir=mkdtempSync(join(tmpdir(),'adaptive-bridge-'));let child:ReturnType<typeof spawn>|undefined;
 const url=`http://127.0.0.1:${port}`;const auth={Authorization:'Bearer test-token','Content-Type':'application/json'};
 async function start(){child=spawn(process.execPath,['lib/bridge.mjs'],{env:{...process.env,ADAPTIVE_WORKSPACE_DATA_DIR:dir,ADAPTIVE_WORKSPACE_PORT:String(port),ADAPTIVE_WORKSPACE_TOKEN:'test-token'},stdio:'ignore'});for(let i=0;i<100;i++){try{if((await fetch(url+'/internal/health',{headers:auth})).ok)return;}catch{}await new Promise(r=>setTimeout(r,20))}throw new Error('Bridge failed to start')}
 async function stop(){if(child&&child.exitCode===null){const done=once(child,'exit');child.kill('SIGTERM');await done;}}
 try{
 await start();assert.equal((await fetch(url+'/internal/health')).status,401);
 for(const payload of ['{}','"{}"']) {
  const read=await fetch(url+'/internal/action',{method:'POST',headers:auth,body:JSON.stringify({sessionId:'test-session',action:'get_catalog',payload})});
  assert.equal(read.status,200);assert((await read.json()).components.Table);
 }
 const r=await fetch(url+'/internal/action',{method:'POST',headers:auth,body:JSON.stringify({sessionId:'test-session',action:'open_view',payload:{title:'Planning'}})});assert.equal(r.status,200);const view=await r.json();
 const edited=await fetch(url+'/api/harness/test-session/workspace',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({viewId:view.id,revision:0,fields:{decision:'Option A'}})});assert.equal(edited.status,200);
 assert.equal((await fetch(url+'/')).status,200);await stop();await start();
 const state=await (await fetch(url+'/api/harness/test-session/workspace')).json();assert.equal(state.views[0].fields.decision,'Option A');assert.equal(state.opened,1);
 }finally{await stop();rmSync(dir,{recursive:true,force:true})}
});
