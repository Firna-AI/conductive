// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import type { AppServices } from '../../../app/services'
import paneStyles from '../../../terminal/TerminalTool.module.css'
import { byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import type { FakeTerminalSocket } from '../../../test-support/fake-terminal-socket'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
} from '../../../test-support/mount'
import { settle } from '../../test-mount'
import { recordingSocket } from '../kept-test-kit'
import { openTab } from '../wiring-test-kit'
import { firstTerminal, openTerminals, terminalTabs } from './terminal-tabs-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/**
 * The event source of the fake server, whose terminal sockets reach the
 * fake shells of the server through the codec of the app. Each open
 * records its path and its socket.
 */
function liveSockets(server: FakeApiServer) {
  const opened: { path: string; socket: FakeTerminalSocket }[] = []
  const events: AppServices['events'] = {
    ...recordingSocket(server).source,
    openSocket: (path, protocol) => {
      const socket = server.terminals.open(path, protocol)
      opened.push({ path, socket })
      return socket
    },
  }
  return { events, opened }
}

/**
 * The pane of each mounted terminal, in the order of the tabs: whether it
 * shows, its xterm.js screen element, and whether it says Disconnected.
 */
function panes(view: HTMLElement) {
  const tools = byRole('region', 'Tools', view)
  const all = tools.querySelectorAll<HTMLElement>(`.${paneStyles.pane}`)
  return Array.from(all, (pane) => ({
    shown: !pane.hidden,
    screen: pane.querySelector('.xterm'),
    disconnected:
      pane
        .querySelector('[role="status"]')
        ?.textContent?.includes('Disconnected') ?? false,
  }))
}

describe('the Reconnect of one terminal', () => {
  test('opens one new connection of its own terminal, and the other terminal keeps its screen and its connection', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const [second] = await openTerminals(server, 1)
    const { events, opened } = liveSockets(server)
    const { view } = await openTab(server, routes.workspace(org, id), {
      events,
    })
    await press(byRole('link', 'Terminal 2', view))
    await settle()
    const shownBoth = opened.map(({ path }) => path)
    const before = panes(view)

    // The connection of the shown terminal ends, as a dropped network does.
    act(() => opened[1].socket.close())
    await settle()
    const ended = panes(view).map(({ shown, disconnected }) => ({
      shown,
      disconnected,
    }))

    await press(byRole('button', 'Reconnect', view))
    await settle()
    const after = panes(view)

    expect({ shownBoth, ended }).toEqual({
      shownBoth: [firstTerminal.socketPath, second.socketPath],
      ended: [
        { shown: false, disconnected: false },
        { shown: true, disconnected: true },
      ],
    })
    expect({
      paths: opened.map(({ path }) => path),
      states: opened.map(({ socket }) => socket.readyState),
      disconnected: after.map(({ disconnected }) => disconnected),
      newScreen:
        after[1].screen !== null && after[1].screen !== before[1].screen,
      keptScreen:
        after[0].screen !== null && after[0].screen === before[0].screen,
    }).toEqual({
      // One new socket, at the path of the terminal that reconnected.
      paths: [firstTerminal.socketPath, second.socketPath, second.socketPath],
      // Open, closed by the drop, open.
      states: [1, 3, 1],
      disconnected: [false, false],
      newScreen: true,
      keptScreen: true,
    })

    // Another member opens a terminal: its tab shows, and no socket opens
    // or closes.
    await act(async () => {
      await openTerminals(server, 1)
    })
    await settle()

    expect({
      names: terminalTabs(view).names,
      paths: opened.length,
      states: opened.map(({ socket }) => socket.readyState),
    }).toEqual({
      names: ['Terminal 1', 'Terminal 2', 'Terminal 3'],
      paths: 3,
      states: [1, 3, 1],
    })
  })
})
