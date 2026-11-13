import type { RunnerConnectionRequest } from '../../../../src/shared/runner-transport'

export interface WorkspaceToolRuntime {
  machineOrigin: string
  workspaceToken: string
}

export function workspaceToolRuntime(
  request: RunnerConnectionRequest,
): WorkspaceToolRuntime {
  const url = new URL(request.url)
  if (url.protocol === 'wss:') url.protocol = 'https:'
  if (url.protocol === 'ws:') url.protocol = 'http:'
  return { machineOrigin: url.origin, workspaceToken: request.workspaceToken }
}
