import type { WorkspaceState } from '../shared/generated/WorkspaceState'
import { describe, expect, it } from 'vitest'
import type { WorkspaceEvent } from '../shared/events'
import {
  terminalPaths,
  type TerminalEntry,
  type TerminalResponse,
} from '../shared/terminal'

import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import type { ToolResult } from './tool-parts/request'
import {
  initialReadiness,
  readinessReducer,
  type TerminalReadiness,
  type TerminalReadinessAction,
} from './terminalReadiness'

const org = 'acme'
const workspace = 'checkout-autocomplete'

/** A ready answer of an older server, which has no list of terminals. */
const ready = {
  state: 'ready',
  socketPath: terminalPaths.socket(org, workspace),
  protocol: 'tty',
} as const

function entry(id: string, number: number): TerminalEntry {
  return {
    id,
    number,
    socketPath: terminalPaths.terminalSocket(org, workspace, id),
  }
}

const first = entry('workspace', 1)
const second = entry('2'.repeat(32), 2)
const third = entry('3'.repeat(32), 3)

/** A ready answer with its list, as the Worker sends it. */
function listed(terminals: readonly TerminalEntry[]): TerminalResponse {
  return { ...ready, terminals, several: true }
}

function answer(
  read: number,
  value: TerminalResponse,
): TerminalReadinessAction {
  const result: ToolResult<TerminalResponse> = { ok: true, value }
  return { type: 'answer', read, result }
}

/** The event that reports the workspace in a new state. */
function updated(state: WorkspaceState): WorkspaceEvent {
  const { workspace } = workspaceFixtures().detail
  return { type: 'workspace.updated', workspace: { ...workspace, state } }
}

function changed(terminals: readonly TerminalEntry[]): WorkspaceEvent {
  return { type: 'terminals.updated', terminals }
}

function reduce(...actions: (TerminalReadinessAction | WorkspaceEvent)[]) {
  return actions.reduce(readinessReducer, initialReadiness)
}

/** The terminals of a ready tool, or null when it does not show them. */
function terminalsOf(state: TerminalReadiness) {
  return state.view.state === 'ready' ? state.view.terminals : null
}

describe('terminal readiness', () => {
  it('reads again when the sandbox runs during a read, and keeps the older answer from a wait', () => {
    const state = reduce(
      updated('input'),
      answer(1, { state: 'starting', socketPath: null }),
    )

    expect(state).toEqual({ view: { state: 'loading' }, read: 2 })
    // An older server sends no list: its one terminal opens its socket.
    expect(readinessReducer(state, answer(2, ready))).toEqual({
      view: expect.objectContaining({
        state: 'ready',
        terminals: [
          { id: 'workspace', number: 1, socketPath: ready.socketPath },
        ],
        several: false,
      }),
      read: 2,
    })
  })

  it('keeps a connected terminal when the workspace moves between running states', () => {
    const connected = reduce(answer(1, listed([first, second])))
    const state = [
      updated('working'),
      updated('input'),
      updated('unread'),
    ].reduce(readinessReducer, connected)

    expect(state).toBe(connected)
  })

  it('reads again when the list changes during a read, so an older answer cannot hide the change', () => {
    const state = reduce(changed([first, second]))

    expect(state).toEqual({ view: { state: 'loading' }, read: 2 })
    expect(readinessReducer(state, answer(1, listed([first])))).toBe(state)
    const answered = readinessReducer(state, answer(2, listed([first, second])))
    expect(terminalsOf(answered)).toEqual([first, second])
  })

  it('shows an opened terminal and drops a closed one before their events, in the order of the numbers', () => {
    const opened = reduce(answer(1, listed([first, third])), {
      type: 'opened',
      terminal: second,
    })
    const closed = readinessReducer(opened, {
      type: 'closed',
      terminalId: first.id,
    })

    expect(terminalsOf(opened)).toEqual([first, second, third])
    expect(terminalsOf(closed)).toEqual([second, third])
    expect(terminalsOf(readinessReducer(closed, changed([third])))).toEqual([
      third,
    ])
  })
})
