import type { EmptyRequest } from '../shared/api'
import {
  isTerminalId,
  terminalPaths,
  type CreateTerminalResponse,
  type TerminalEntry,
  type TerminalListResponse,
  type TerminalResponse,
} from '../shared/terminal'
import { isRecord, requestJson, type ToolResult } from './tool-parts/request'
import type { ToolRequests } from './tool-parts/workspace'

export type ReadyTerminal = Extract<TerminalResponse, { state: 'ready' }>

/** The order of the tabs: the numbers of the terminals. */
export function byNumber(left: TerminalEntry, right: TerminalEntry): number {
  return left.number - right.number
}

/** Narrows one terminal of a list, or gives null for any other value. */
function parseEntry(value: unknown): TerminalEntry | null {
  if (!isRecord(value)) return null
  const { id, number, socketPath } = value
  if (!isTerminalId(id) || typeof socketPath !== 'string') return null
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1)
    return null
  return { id, number, socketPath }
}

/**
 * Narrows the terminals of a workspace, in the order of their numbers. An
 * empty list gives null too, because a workspace always has a terminal.
 */
export function parseTerminalList(
  value: unknown,
): readonly TerminalEntry[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const entries = value.map(parseEntry)
  return entries.every((entry) => entry !== null)
    ? entries.sort(byNumber)
    : null
}

/**
 * The list of a ready answer. An older server leaves out `terminals` and
 * `several`, which the tool then reads as one terminal.
 */
function listOf(
  body: Record<string, unknown>,
): Pick<TerminalResponse, 'terminals' | 'several'> | null {
  const { terminals, several } = body
  if (several !== undefined && typeof several !== 'boolean') return null
  if (terminals === undefined) return several === undefined ? {} : { several }
  const list = parseTerminalList(terminals)
  if (list === null) return null
  return several === undefined
    ? { terminals: list }
    : { terminals: list, several }
}

/** Narrows the terminal response, or gives null for any other body. */
function parseTerminalResponse(body: unknown): TerminalResponse | null {
  if (!isRecord(body)) return null
  const { state, socketPath, protocol } = body
  if (state === 'starting' || state === 'stopped') {
    return { state, socketPath: null }
  }
  if (state !== 'ready' || typeof socketPath !== 'string') return null
  if (protocol !== 'tty') return null
  const list = listOf(body)
  return list === null ? null : { state, socketPath, protocol, ...list }
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

function parseCreated(body: unknown): CreateTerminalResponse | null {
  if (!isRecord(body)) return null
  const terminal = parseEntry(body.terminal)
  const terminals = parseTerminalList(body.terminals)
  return terminal && terminals ? { terminal, terminals } : null
}

function parseClosed(body: unknown): TerminalListResponse | null {
  if (!isRecord(body)) return null
  const terminals = parseTerminalList(body.terminals)
  return terminals ? { terminals } : null
}

/** Opens a terminal with the lowest free number. */
export function openTerminal(
  workspace: ToolRequests,
): Promise<ToolResult<CreateTerminalResponse>> {
  const body: EmptyRequest = {}
  const { orgId, workspaceId } = workspace
  return requestJson(
    workspace.fetch,
    { method: 'POST', path: terminalPaths.terminals(orgId, workspaceId), body },
    parseCreated,
  )
}

/**
 * Closes one terminal, which ends its shell for every member. The tool does
 * not abort it, so a close that the user confirmed reaches the server.
 */
export function closeTerminal(
  workspace: ToolRequests,
  terminalId: string,
): Promise<ToolResult<TerminalListResponse>> {
  const body: EmptyRequest = {}
  const { orgId, workspaceId } = workspace
  return requestJson(
    workspace.fetch,
    {
      method: 'DELETE',
      path: terminalPaths.terminal(orgId, workspaceId, terminalId),
      body,
    },
    parseClosed,
  )
}
