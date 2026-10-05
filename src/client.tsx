/** A new tab type in the original Harness right sidebar; existing UI stays intact. */
import React from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { Context } from '@deepseek-ai/cordis'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

export const inject = ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs', 'uiSession']
interface Config { bridgeUrl: string; webPath?: string }
function Workspace(props: PropsRuntime<'sidebar.right.pane.tab'> & { bridgeUrl: string; label: string }) {
  return <iframe title={props.label} src={`${props.bridgeUrl}/?embed=1&harnessSession=${encodeURIComponent(props.sessionId)}`} style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
}
export function apply(ctx: Context): void {
  const config = (globalThis as typeof globalThis & { __ADAPTIVE_WORKSPACE_CONFIG__?: Config }).__ADAPTIVE_WORKSPACE_CONFIG__
  if (!config?.bridgeUrl) throw new Error('Adaptive workspace configuration is missing')
  if(location.protocol==='http:'||location.protocol==='https:') config.bridgeUrl=config.webPath??'/adaptive-workspaces'
  const id = '@maxi/adaptive-workspaces'
  const label = () => ctx.locale.getSnapshot().active === 'zh' ? '自适应工作区' : 'Adaptive workspace'
  ctx.effect(() => ctx.sidebarRightTabs.register({ id, kind: 'adaptive-workspaces', title: label,
    guide: [{ id: 'workspace', order: 40, title: label, description: () => 'Task-specific views · json-render' }] }), 'adaptive-workspaces.tab')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: id, inject: () => ({ bridgeUrl: config.bridgeUrl, label: label() }),
  }, Workspace)), 'adaptive-workspaces.view')
  ctx.effect(() => {
    const controller = new AbortController()
    const seen = new Map<string, number>()
    let pending = false
    const poll = async () => {
      const key = ctx.uiSession.adapter.current.getSnapshot().key
      if (!key || pending) return
      pending = true
      try {
        const response = await fetch(`${config.bridgeUrl}/api/harness/${encodeURIComponent(key)}/opened`, { signal: controller.signal })
        if (!response.ok) return
        const state: { opened: number } = await response.json()
        if (state.opened > (seen.get(key) ?? 0)) {
          ctx.sidebarRight.openTabIn(key as SessionId, 'adaptive-workspaces')
          seen.set(key, state.opened)
        }
      } catch (error) {
        // Bridge may be restarting; the next scheduled request recovers without changing the app.
        if (!controller.signal.aborted) console.debug('Adaptive workspace bridge unavailable', String(error))
      } finally { pending = false }
    }
    const timer = setInterval(() => { void poll() }, 1200)
    void poll()
    return () => { clearInterval(timer); controller.abort() }
  }, 'adaptive-workspaces.open-requests')
}
