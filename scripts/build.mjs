import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('lib',{recursive:true});
await build({entryPoints:['src/index.ts'],outfile:'lib/index.js',bundle:true,packages:'external',platform:'node',format:'esm',target:'node24'});
await build({entryPoints:['server/index.ts'],outfile:'lib/bridge.mjs',bundle:true,packages:'external',platform:'node',format:'esm',target:'node24'});
const client=await build({entryPoints:['src/client.tsx'],write:false,bundle:true,external:['react','react/jsx-runtime'],platform:'browser',format:'cjs',target:'es2022'});
await writeFile('lib/client.js','window.__ModuleLoader__.load({id:"@maxi/adaptive-workspaces",factory:(require)=>{var module={exports:{}};var exports=module.exports;\n'+client.outputFiles[0].text+'\nreturn module.exports;}});\n');
