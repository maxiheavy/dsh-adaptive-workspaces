import { z } from 'zod';
/** Some OpenAI-compatible tool parsers encode object parameters as JSON strings. */
export function decodeObject(value:unknown):unknown {
 let decoded=value;
 for(let depth=0;depth<2&&typeof decoded==='string';depth++) {
  if(decoded.length>200000)throw new Error('Workspace payload is too large');
  try { decoded=JSON.parse(decoded); }
  catch { throw new Error('Workspace payload must be an object or valid JSON encoding of an object'); }
 }
 return decoded;
}
export const toolInputSchema=z.object({
 sessionId:z.string().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/),
 action:z.enum(['get_catalog','get_state','open_view','update_view']),
 payload:z.preprocess(decodeObject,z.record(z.string(),z.unknown())).default({}),
}).strict();
