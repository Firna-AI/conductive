// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../../app/test-kit'
import { terminalPaths, type TerminalResponse } from '../../../shared/terminal'
import { queryByLabel } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { settle } from '../../test-mount'
import { emit, lastEvent } from '../kept-test-kit'
import { openTab, socketsOf } from '../wiring-test-kit'
import { firstTerminal, terminalTabs } from './terminal-tabs-kit'
import { toolHref } from './tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const statePath = terminalPaths.connection(org, id)

/** The reads of the terminal state that the app sent. */
const stateReads = (server: FakeApiServer) =>
  requestLines(server).filter((line) => line === `GET ${statePath}`).length

/** Whether the Terminal tool shows its row of terminal tabs. */
const showsRow = (view: HTMLElement) => queryByLabel('Terminals', view) !== null

describe('the row of terminal tabs after a Restart', () => {
  test('reads the terminal state again when the workspace runs after a Restart, and shows the row when the new terminal service opens several shells', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ terminalSeveral: false })
    const { events } = socketsOf(server)
    const { view } = await openTab(server, toolHref(org, id, 'terminal'), {
      events,
    })
    const before = { row: showsRow(view), reads: stateReads(server) }
    const { workspace } = workspaceFixtures().detail

    // A Restart shows Starting until the runner is ready again.
    emit(server, {
      type: 'workspace.updated',
      workspace: { ...workspace, state: 'starting' },
    })
    await settle()
    const starting = showsRow(view)
    const restarted: TerminalResponse = {
      state: 'ready',
      socketPath: terminalPaths.socket(org, id),
      protocol: 'tty',
      terminals: [firstTerminal],
      several: true,
      eventNumber: lastEvent(server),
    }
    server.json('GET', statePath, restarted)
    emit(server, {
      type: 'workspace.updated',
      workspace: { ...workspace, state: 'ready' },
    })
    await waitFor(() => showsRow(view), 'the row of terminal tabs')

    expect({
      before,
      starting,
      tabs: terminalTabs(view),
      reads: stateReads(server),
    }).toEqual({
      before: { row: false, reads: 1 },
      starting: false,
      tabs: { names: ['Terminal 1'], shown: ['Terminal 1'] },
      reads: 2,
    })
  })

  test('shows the row in an open tab when a list event says that the terminal service opens several shells, and hides it again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ terminalSeveral: false })
    const { events } = socketsOf(server)
    const { view } = await openTab(server, toolHref(org, id, 'terminal'), {
      events,
    })
    const before = showsRow(view)

    emit(server, {
      type: 'terminals.updated',
      terminals: [firstTerminal],
      several: true,
    })
    await settle()
    const shown = terminalTabs(view)
    emit(server, {
      type: 'terminals.updated',
      terminals: [firstTerminal],
      several: false,
    })
    await settle()

    expect({
      before,
      shown,
      after: showsRow(view),
      reads: stateReads(server),
    }).toEqual({
      before: false,
      shown: { names: ['Terminal 1'], shown: ['Terminal 1'] },
      after: false,
      reads: 1,
    })
  })
})
