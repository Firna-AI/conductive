import { terminalPaths, type TerminalResponse } from '../shared/terminal'
import { isRecord, requestJson, type ToolResult } from './tool-parts/request'
import type { ToolRequests } from './tool-parts/workspace'

export type ReadyTerminal = Extract<TerminalResponse, { state: 'ready' }>

/** Narrows the terminal response, or gives null for any other body. */
export function parseTerminalResponse(body: unknown): TerminalResponse | null {
  if (!isRecord(body)) return null
  const { state, socketPath, protocol } = body
  if (state === 'starting' || state === 'stopped') {
    return { state, socketPath: null }
  }
  if (state !== 'ready' || typeof socketPath !== 'string') return null
  return protocol === 'tty' ? { state, socketPath, protocol } : null
}

/** Reads the terminal state of the workspace. */
export function loadTerminal(
  workspace: ToolRequests,
  signal: AbortSignal,
): Promise<ToolResult<TerminalResponse>> {
  const { orgId, workspaceId } = workspace
  return requestJson(
    workspace.fetch,
    {
      method: 'GET',
      path: terminalPaths.connection(orgId, workspaceId),
      signal,
    },
    parseTerminalResponse,
  )
}
