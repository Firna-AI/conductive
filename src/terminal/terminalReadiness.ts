import type { WorkspaceState } from '../shared/generated/WorkspaceState'
import type { WorkspaceEvent } from '../shared/events'
import type { TerminalEnd, TerminalResponse } from '../shared/terminal'

import type { ReadyTerminal } from './terminalApi'
import type { ToolError, ToolResult } from './tool-parts/request'

type TerminalView =
  | { state: 'loading' | 'starting' | 'stopped' }
  | { state: 'error'; error: ToolError }
  | { state: 'ready'; terminal: ReadyTerminal; ended: boolean }

export interface TerminalReadiness {
  view: TerminalView
  /** The read whose answer counts. Each new read makes older answers stale. */
  read: number
  /**
   * The automatic try after a lost connection: its read, while the ended
   * screen stays, and then its connection.
   */
  automatic: boolean
}

export type TerminalReadinessAction =
  | { type: 'answer'; read: number; result: ToolResult<TerminalResponse> }
  | { type: 'retry' }
  /**
   * The connection ended `lasted` milliseconds after its first output, or
   * with no output, as 0.
   */
  | { type: 'ended'; end: TerminalEnd; lasted: number }

export const initialReadiness: TerminalReadiness = {
  view: { state: 'loading' },
  read: 1,
  automatic: false,
}

/**
 * A connection that stays open this long after its first output works. When
 * an automatic try ends sooner, the try failed.
 */
const WORKING_CONNECTION_MS = 60_000

/** The workspace states in which the sandbox runs. */
const running: ReadonlySet<WorkspaceState> = new Set([
  'ready',
  'working',
  'input',
  'unread',
])

function nextRead(state: TerminalReadiness): TerminalReadiness {
  return { view: { state: 'loading' }, read: state.read + 1, automatic: false }
}

/**
 * A lost connection connects again once by itself. While that try reads the
 * terminal, the ended screen stays, so its output stays too. When the try
 * fails, or the shell ended, the screen shows Disconnected with Reconnect.
 */
function ended(
  state: TerminalReadiness,
  action: { end: TerminalEnd; lasted: number },
): TerminalReadiness {
  const { view } = state
  if (view.state !== 'ready' || view.ended) return state
  const failedTry = state.automatic && action.lasted < WORKING_CONNECTION_MS
  const endedView = { ...view, ended: true }
  if (action.end === 'lost' && !failedTry)
    return { view: endedView, read: state.read + 1, automatic: true }
  return { ...state, view: endedView, automatic: false }
}

/** Whether the screen shows Disconnected with Reconnect. */
export function disconnected(state: TerminalReadiness): boolean {
  return state.view.state === 'ready' && state.view.ended && !state.automatic
}

function answered(result: ToolResult<TerminalResponse>): TerminalView {
  if (!result.ok) return { state: 'error', error: result.error }
  const terminal = result.value
  if (terminal.state === 'ready') {
    return { state: 'ready', terminal, ended: false }
  }
  return { state: terminal.state }
}

/** An automatic try that finds no ready terminal keeps the ended screen. */
function answer(
  state: TerminalReadiness,
  result: ToolResult<TerminalResponse>,
): TerminalReadiness {
  const view = answered(result)
  if (state.automatic && view.state !== 'ready' && state.view.state === 'ready')
    return { ...state, automatic: false }
  return { ...state, view }
}

/**
 * The tool's own actions, and the events of its workspace. A running sandbox
 * makes a loading or waiting terminal read its state again.
 */
export function readinessReducer(
  state: TerminalReadiness,
  action: TerminalReadinessAction | WorkspaceEvent,
): TerminalReadiness {
  switch (action.type) {
    case 'answer':
      // An answer to an older read is stale. It can't restore a wait.
      return action.read === state.read ? answer(state, action.result) : state
    case 'workspace.updated': {
      // While a read runs or the terminal waits, a running sandbox needs a
      // new read. The new read makes the answer of a running read stale.
      const { view } = state
      const waiting =
        view.state === 'loading' ||
        view.state === 'starting' ||
        view.state === 'stopped'
      const runs = running.has(action.workspace.state)
      return waiting && runs ? nextRead(state) : state
    }
    case 'retry':
      return nextRead(state)
    case 'ended':
      return ended(state, action)
    default:
      // The other events of the workspace leave the terminal as it is.
      return state
  }
}
