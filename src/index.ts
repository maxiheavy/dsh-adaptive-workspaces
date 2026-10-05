import { request } from 'node:http'
import type {} from '@deepseek-ai/dsh-client-connection'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
/** Add Adaptive workspace tools beside the unmodified Harness tool roster. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-host-webserver'

export const inject = ['tools', 'systemPrompt', 'webServer', 'connection']
export interface Config { bridgeUrl: string; dataDir?: string }
export async function apply(ctx: Context, config: Config): Promise<void> {
  ctx.on('webserver/index-inject', table => { table.push({kind:'global',name:'__ADAPTIVE_WORKSPACE_CONFIG__',value:{bridgeUrl:config.bridgeUrl,webPath:'/adaptive-workspaces'}}) })
  const token = randomBytes(32).toString('hex')
  const url = new URL(config.bridgeUrl)
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:') throw new Error('Workspace service must use loopback HTTP')
  const dataDir = config.dataDir ?? resolve(process.env.DSH_HOME ?? resolve(homedir(), '.deepseek-harness'), 'adaptive-workspaces')
  let startupError: Error | undefined
  const child = spawn(process.execPath, [fileURLToPath(new URL('./bridge.mjs', import.meta.url))], {
    env: { ...process.env, ADAPTIVE_WORKSPACE_PORT: url.port, ADAPTIVE_WORKSPACE_DATA_DIR: dataDir, ADAPTIVE_WORKSPACE_TOKEN: token },
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  child.on('error', error => { startupError = error })
  ctx.effect(() => () => { child.kill('SIGTERM') }, 'adaptive-workspace-process')
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError) throw startupError
    if (child.exitCode !== null) throw new Error('Adaptive workspace process exited during startup')
    try {
      const r = await fetch(new URL('/internal/health', config.bridgeUrl), { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(500) })
      if (r.ok) { ready = true; break }
    } catch (error) { /* The child has not bound its socket yet. */ }
    await new Promise(r => setTimeout(r, 100))
  }
  if (!ready) { child.kill('SIGTERM'); throw new Error('Adaptive workspace did not become ready') }
  ctx.effect(() => ctx.webServer.register({kind:'prefix',path:'/adaptive-workspaces',handler:(req,res)=>{
    const admission=ctx.connection.admit(req)
    if('rejection' in admission){res.writeHead(admission.rejection);res.end('Unauthorized');return}
    const path=(req.url??'').slice('/adaptive-workspaces'.length)||'/'
    const pathname=new URL(path,'http://localhost').pathname
    if(!(pathname==='/'||pathname.startsWith('/assets/')||/^\/api\/harness\/[a-zA-Z0-9_-]+\/(opened|workspace)$/.test(pathname))){res.writeHead(404);res.end();return}
    if(!['GET','HEAD','PATCH'].includes(req.method??'')){res.writeHead(405);res.end();return}
    const headers:Record<string,string>={}
    if(req.headers['content-type'])headers['content-type']=req.headers['content-type']
    const upstream=request(new URL(path,config.bridgeUrl),{method:req.method,headers},response=>{
      res.statusCode=response.statusCode??502
      for(const key of ['content-type','cache-control','etag'])if(response.headers[key])res.setHeader(key,response.headers[key]!)
      res.setHeader('Content-Security-Policy',"frame-ancestors 'self'")
      res.setHeader('X-Content-Type-Options','nosniff')
      response.pipe(res)
    })
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Workspace service unavailable')})
    req.pipe(upstream)
  }}),'adaptive-workspaces.proxy')
  const endpoint = new URL('/internal/action', config.bridgeUrl).href
  ctx.systemPrompt.section({ name: 'adaptive-workspaces', order: 95, text:
    'You can adapt the local UI to the current task with adaptive_workspace. When a task benefits from a dedicated visual workspace, call get_catalog, then open_view with a json-render spec tailored to that task. Use update_view to change an existing view as the work evolves. Use get_state to read persisted user input and current revisions first. Your text conversation stays visible in DeepSeek Harness. Use available skills and MCP tools for domain work, then present their results using these components. Do not assume Fern or video editing. The catalog defines available components; do not invent components or claim that a displayed proposal executed external work. No executable code is allowed in views.' })
  ctx.tools.register({
    name: 'adaptive_workspace',
    description: 'Create and adapt persistent task-specific json-render views beside the native DeepSeek conversation. Domain-neutral: research, planning, analysis, review, or other work.',
    parameters: {
      action: { type: 'string', required: true, enum: ['get_catalog', 'get_state', 'open_view', 'update_view'], description: 'Read the catalog/state or create/update a view.' },
      payload: { type: 'object', required: true, additionalProperties: false, description: 'Structured view arguments; never serialize this as a JSON string. Empty object for reads.', properties: {
        title: { type: 'string', description: 'Title for a new or updated view.' },
        viewId: { type: 'string', description: 'Existing view ID for updates.' },
        revision: { type: 'integer', description: 'Current revision from get_state, required for updates.' },
        spec: { type: 'object', additionalProperties: false, description: 'Complete json-render tree. Both root and elements are required. Read get_catalog for component props.', properties: {
          root: { type: 'string', required: true, description: 'ID of the Workspace root element.' },
          elements: { type: 'object', required: true, additionalProperties: true, description: 'Map of element IDs to {type,props,children?}. Must contain the root and every referenced child.' },
        } },
      } },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: String(value) }] },
    async execute(args, exec) {
      if (!exec.agent) throw new Error('A Harness session is required')
      const response = await fetch(endpoint, {
        method: 'POST', signal: exec.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId: exec.agent.id, ...args as object }),
      })
      const body = await response.text()
      if (!response.ok) throw new Error(body)
      return body
    },
    presentCall: args => ({ card: 'generic', title: 'Adaptive workspace', kind: 'other', rawInput: args }),
  })
}
