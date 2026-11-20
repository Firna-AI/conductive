import { warnProviderStop } from '../lifecycle/provider-stop-warning'
import type { WorkspaceStopHook } from '../lifecycle/workspace-platform'
import type { WorkspaceChat } from './backend'

export function workspaceStopHooks(
  chat: WorkspaceChat,
  waitUntil: (promise: Promise<unknown>) => void,
  reconcile: () => Promise<unknown>,
) {
  const hooks: WorkspaceStopHook[] = []
  const stopped: WorkspaceStopHook = async (id, options) => {
    for (const hook of hooks) await hook(id, options)
    await chat.stopWorkspace(id, options)
    waitUntil(reconcile())
  }
  return {
    stopped,
    stopping: async (id: string) => {
      for (const hook of hooks) await hook(id)
    },
    providerStopped: (id: string, account: string) =>
      warnProviderStop(id, account, chat.runner.connections.current),
    onStopped: (hook: WorkspaceStopHook) => hooks.push(hook),
  }
}
