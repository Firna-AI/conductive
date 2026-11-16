import type { WorkspaceState } from '../shared/generated/WorkspaceState'
import type { WorkspaceEvent } from '../shared/events'
import type { TerminalResponse } from '../shared/terminal'

import {
  readyReducer,
  readyTerminals,
  withTerminals,
  type ReadyTerminals,
  type ReadyTerminalsAction,
} from './readyTerminals'
import { byNumber } from './terminalApi'
import type { ToolError, ToolResult } from './tool-parts/request'

type TerminalView =
  | { state: 'loading' | 'starting' | 'stopped' }
  | { state: 'error'; error: ToolError }
  | ReadyTerminals

export interface TerminalReadiness {
  view: TerminalView
  /** The read whose answer counts. Each new read makes older answers stale. */
  read: number
}

export type TerminalReadinessAction =
  | { type: 'answer'; read: number; result: ToolResult<TerminalResponse> }
  | { type: 'retry' }
  | ReadyTerminalsAction

export const initialReadiness: TerminalReadiness = {
  view: { state: 'loading' },
  read: 1,
}

/** The workspace states in which the sandbox runs. */
const running: ReadonlySet<WorkspaceState> = new Set([
  'ready',
  'working',
  'input',
  'unread',
])

function nextRead(state: TerminalReadiness): TerminalReadiness {
  return { view: { state: 'loading' }, read: state.read + 1 }
}

function answered(result: ToolResult<TerminalResponse>): TerminalView {
  if (!result.ok) return { state: 'error', error: result.error }
  const terminal = result.value
  if (terminal.state === 'ready') return readyTerminals(terminal)
  return { state: terminal.state }
}

/** Gives an action of the tool to its ready terminals, if they show. */
function onReady(
  state: TerminalReadiness,
  change: (ready: ReadyTerminals) => ReadyTerminals,
): TerminalReadiness {
  if (state.view.state !== 'ready') return state
  const view = change(state.view)
  return view === state.view ? state : { ...state, view }
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
      return action.read === state.read
        ? { ...state, view: answered(action.result) }
        : state
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
    case 'terminals.updated': {
      // The answer of a read that runs can hold the list from before the
      // change, so the change needs a new read. A ready tool takes the list.
      if (state.view.state === 'loading') return nextRead(state)
      const terminals = [...action.terminals].sort(byNumber)
      if (terminals.length === 0) return state
      return onReady(state, (ready) => withTerminals(ready, terminals))
    }
    case 'retry':
      return nextRead(state)
    case 'shown':
    case 'ended':
    case 'reconnect':
    case 'open':
    case 'opened':
    case 'open-failed':
    case 'close':
    case 'closed':
    case 'close-failed':
      return onReady(state, (ready) => readyReducer(ready, action))
    default:
      // The other events of the workspace leave the terminal as it is.
      return state
  }
}
