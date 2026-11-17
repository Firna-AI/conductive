import type { WorkspaceState } from '../shared/generated/WorkspaceState'
import { describe, expect, it } from 'vitest'
import type { WorkspaceEvent } from '../shared/events'
import {
  terminalPaths,
  type TerminalEnd,
  type TerminalResponse,
} from '../shared/terminal'

import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import type { ToolResult } from './tool-parts/request'
import {
  disconnected,
  initialReadiness,
  readinessReducer,
  type TerminalReadinessAction,
} from './terminalReadiness'

const ready = {
  state: 'ready',
  socketPath: terminalPaths.socket('acme', 'checkout-autocomplete'),
  protocol: 'tty',
} as const

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

function ended(end: TerminalEnd, lasted: number): TerminalReadinessAction {
  return { type: 'ended', end, lasted }
}

function reduce(...actions: (TerminalReadinessAction | WorkspaceEvent)[]) {
  return actions.reduce(readinessReducer, initialReadiness)
}

describe('terminal readiness', () => {
  it('reads again when the sandbox runs during a read, and keeps the older answer from a wait', () => {
    const state = reduce(
      updated('input'),
      answer(1, { state: 'starting', socketPath: null }),
    )

    expect(state).toEqual({
      view: { state: 'loading' },
      read: 2,
      automatic: false,
    })
    expect(readinessReducer(state, answer(2, ready))).toEqual({
      view: { state: 'ready', terminal: ready, ended: false },
      read: 2,
      automatic: false,
    })
  })

  it('keeps a connected terminal when the workspace moves between running states', () => {
    const state = reduce(
      answer(1, ready),
      updated('working'),
      updated('input'),
      updated('unread'),
    )

    expect(state).toEqual({
      view: { state: 'ready', terminal: ready, ended: false },
      read: 1,
      automatic: false,
    })
  })

  it('connects again once by itself after each lost connection that worked, and shows Disconnected when that try ends within a minute', () => {
    // The ended screen stays while the try reads the terminal.
    const afterDrop = reduce(answer(1, ready), ended('lost', 300_000))
    expect(afterDrop).toEqual({
      view: { state: 'ready', terminal: ready, ended: true },
      read: 2,
      automatic: true,
    })
    expect(disconnected(afterDrop)).toBe(false)

    // The try stayed open for a minute, so it worked.
    const afterWorkingTry = [answer(2, ready), ended('lost', 60_000)].reduce(
      readinessReducer,
      afterDrop,
    )
    expect(afterWorkingTry).toEqual({
      view: { state: 'ready', terminal: ready, ended: true },
      read: 3,
      automatic: true,
    })

    const afterFailedTry = [answer(3, ready), ended('lost', 59_999)].reduce(
      readinessReducer,
      afterWorkingTry,
    )
    expect(afterFailedTry).toEqual({
      view: { state: 'ready', terminal: ready, ended: true },
      read: 3,
      automatic: false,
    })
    expect(disconnected(afterFailedTry)).toBe(true)

    // Reconnect starts a new first connection.
    const afterReconnect = [
      { type: 'retry' } as const,
      answer(4, ready),
      ended('lost', 0),
    ].reduce(readinessReducer, afterFailedTry)
    expect(afterReconnect).toEqual({
      view: { state: 'ready', terminal: ready, ended: true },
      read: 5,
      automatic: true,
    })
  })

  it('keeps the ended screen with Disconnected when the automatic try finds no ready terminal', () => {
    const failure: TerminalReadinessAction = {
      type: 'answer',
      read: 2,
      result: {
        ok: false,
        error: { code: 'network', message: 'The request failed. Try again.' },
      },
    }
    const state = reduce(answer(1, ready), ended('lost', 300_000), failure)

    expect(state).toEqual({
      view: { state: 'ready', terminal: ready, ended: true },
      read: 2,
      automatic: false,
    })
    expect(disconnected(state)).toBe(true)
  })

  it('shows Disconnected at once when the server closes the connection', () => {
    expect(reduce(answer(1, ready), ended('closed', 300_000))).toEqual({
      view: { state: 'ready', terminal: ready, ended: true },
      read: 1,
      automatic: false,
    })
  })
})
