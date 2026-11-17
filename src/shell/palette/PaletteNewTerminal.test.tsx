// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests, requestLines } from '../../app/test-kit'
import { readView } from '../../chat/api/read-view'
import { terminalPaths, type TerminalResponse } from '../../shared/terminal'
import { workspaceViewPath } from '../../shared/workspace-view'
import {
  accessibleName,
  byRole,
  queryByLabel,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import {
  pressCommand,
  pressHintKey,
  serveShortcutChanges,
} from '../shortcuts/shortcut-test-kit'
import { click, settle } from '../test-mount'
import { bodiesOf } from '../workspace/kept-test-kit'
import {
  firstTerminal,
  openTerminals,
  terminalTabs,
} from '../workspace/tools/terminal-tabs-kit'
import { terminalHref, toolHref } from '../workspace/tools/tool-address'
import { currents, socketsOf } from '../workspace/wiring-test-kit'
import { openPaletteTab, palette } from './palette-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const terminalAddress = toolHref(org, id, 'terminal')

// The app hides Desktop, so the palette offers no Go to Desktop.
const goTo = ['All files', 'Changes', 'Checks', 'Terminal', 'Preview'].map(
  (tab) => `Go to ${tab}`,
)

/** The rows of the open workspace on the Actions tab of the palette. */
function workspaceRows(): string[] {
  pressCommand('command-palette', 'other', document.body)
  click(byRole('tab', 'Actions'))
  const group = byRole('group', 'Checkout address autocomplete')
  return Array.from(group.querySelectorAll('[role="option"]'), accessibleName)
}

/** Whether the Terminal tool shows two terminal tabs, as after an open. */
function twoTabs(view: HTMLElement): boolean {
  if (queryByLabel('Terminals', view) === null) return false
  return terminalTabs(view).names.length === 2
}

/** The terminal that the fake API opened second, after Terminal 1. */
async function secondTerminal(server: FakeApiServer) {
  const state = await server.fetch(terminalPaths.connection(org, id))
  const listed: TerminalResponse = await state.json()
  const second = listed.terminals?.[1]
  if (!second) throw new Error('The workspace has no second terminal.')
  return second
}

describe('New terminal in the command palette', () => {
  test.each([
    {
      shows: 'Preview',
      href: toolHref(org, id, 'preview'),
      // Terminal 1 never showed, so it opens no connection.
      connected: ['second'],
      // The address of the Terminal tool takes the place of Preview.
      history: [terminalAddress],
    },
    {
      shows: 'the Terminal tool',
      href: terminalAddress,
      connected: ['first', 'second'],
      // As after the +, the address names the new terminal.
      history: [terminalAddress, 'second'],
    },
  ])(
    'while $shows shows, the row opens a terminal and shows it in the Terminal tool',
    async ({ href, connected, history }) => {
      holdAnimationFrames()
      const server = new FakeApiServer()
      const { events, opened } = socketsOf(server)
      const tab = await openPaletteTab(href, { server, events })
      const from = server.requests.length

      pressCommand('command-palette', 'other', document.body)
      click(byRole('option', 'New terminal'))
      await waitFor(() => twoTabs(tab.view), 'a second terminal tab')
      await settle()
      const second = await secondTerminal(server)
      const saves = await bodiesOf(
        server,
        'PUT',
        workspaceViewPath(org, id),
        from,
      )
      const saved = readView({ view: saves.at(-1) })
      const tools = byRole('region', 'Tools', tab.view)

      const socket = {
        first: firstTerminal.socketPath,
        second: second.socketPath,
      }
      expect({
        palette: palette(),
        opens: await bodiesOf(
          server,
          'POST',
          terminalPaths.terminals(org, id),
          from,
        ),
        tool: currents(tools, terminalAddress),
        tabs: terminalTabs(tab.view),
        saved: { tool: saved.tool, terminal: saved.terminal },
        sockets: opened.map(({ path }) => path),
        history: tab.navigation.history,
      }).toEqual({
        palette: null,
        opens: [{}],
        tool: ['page'],
        tabs: { names: ['Terminal 1', 'Terminal 2'], shown: ['Terminal 2'] },
        saved: { tool: 'terminal', terminal: second.id },
        sockets: connected.map((name) =>
          name === 'first' ? socket.first : socket.second,
        ),
        history: history.map((entry) =>
          entry === 'second' ? terminalHref(org, id, second.id) : entry,
        ),
      })
    },
  )

  test.each([
    {
      where: 'below the limit',
      offers: 'New terminal after the Go to rows',
      server: async () => new FakeApiServer(),
      hide: false,
      rows: [
        'New session',
        'Session history',
        ...goTo,
        'New terminal',
        'Archive workspace',
      ],
    },
    {
      where: 'at the limit of 10 terminals',
      offers: 'no New terminal',
      server: async () => {
        const server = new FakeApiServer()
        await openTerminals(server, 9)
        return server
      },
      hide: false,
      rows: ['New session', 'Session history', ...goTo, 'Archive workspace'],
    },
    {
      where: 'with a stopped cloud computer',
      offers: 'no New terminal',
      server: async () => new FakeApiServer({ workspaceState: 'stopped' }),
      hide: false,
      rows: ['New session', 'Session history', ...goTo, 'Archive workspace'],
    },
    {
      where: 'with software for one shell',
      offers: 'no New terminal',
      server: async () => new FakeApiServer({ terminalSeveral: false }),
      hide: false,
      rows: ['New session', 'Session history', ...goTo, 'Archive workspace'],
    },
    {
      where: 'with the right column hidden',
      offers: 'no Go to rows and no New terminal',
      server: async () => new FakeApiServer(),
      hide: true,
      rows: ['New session', 'Session history', 'Archive workspace'],
    },
  ])(
    'on the Actions tab $where, the workspace offers $offers',
    async ({ server, hide, rows }) => {
      holdAnimationFrames()
      await openPaletteTab(routes.workspace(org, id), {
        server: await server(),
      })
      if (hide) {
        pressCommand('toggle-right-column', 'other', document.body)
        await settle()
      }

      expect(workspaceRows()).toEqual(rows)
    },
  )

  test('a key that the person gave New terminal shows in its row and opens one terminal while the palette is closed, and goes on to the page while the open runs', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveShortcutChanges(server, 'other', [
      { command: 'new-terminal', keys: ['Alt+Shift+K'] },
    ])
    const opens = terminalPaths.terminals(org, id)
    const held = new HeldRequests(server)
    held.hold('POST', opens)
    const { app, view } = await openPaletteTab(routes.workspace(org, id), {
      server,
      fetch: held.fetch,
    })
    pressCommand('command-palette', 'other', document.body)
    const option = byRole('option', 'New terminal')
    const row = {
      chips: Array.from(
        option.querySelectorAll('kbd kbd'),
        (chip) => chip.textContent,
      ),
      name: option.getAttribute('aria-keyshortcuts'),
    }
    pressCommand('command-palette', 'other', document.body)

    const first = pressHintKey(app, 'new-terminal', document.body)
    await settle()
    // The + is busy while the open runs, so it offers no key.
    const second = pressHintKey(app, 'new-terminal', document.body)

    expect({
      row,
      first: first.defaultPrevented,
      second: second.defaultPrevented,
    }).toEqual({
      row: { chips: ['Alt', 'Shift', 'K'], name: 'Alt+Shift+K' },
      first: true,
      second: false,
    })
    held.release('POST', opens)
    await waitFor(() => twoTabs(view), 'a second terminal tab')
    expect({
      tabs: terminalTabs(view),
      opens: requestLines(server).filter((line) => line === `POST ${opens}`),
    }).toEqual({
      tabs: { names: ['Terminal 1', 'Terminal 2'], shown: ['Terminal 2'] },
      opens: [`POST ${opens}`],
    })
  })
})
