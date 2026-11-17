// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { readView } from '../../../chat/api/read-view'
import { terminalPaths, type TerminalResponse } from '../../../shared/terminal'
import { workspaceViewPath } from '../../../shared/workspace-view'
import {
  accessibleName,
  byRole,
  queryByRole,
  queryByText,
  shownToasts,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../../test-support/mount'
import { click } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { openTab, socketsOf } from '../wiring-test-kit'
import {
  closeElsewhere,
  failure,
  firstTerminal,
  openTerminals,
  terminalTabs,
} from './terminal-tabs-kit'
import { terminalHref, toolHref } from './tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const toolAddress = toolHref(org, id, 'terminal')
const viewPath = workspaceViewPath(org, id)

/** The shown terminal of a saved view, read as the view route reads it. */
const terminalOf = (body: unknown) => readView({ view: body }).terminal

/** The control that has the keyboard focus, with its name, or none. */
function focused(): string | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || active === document.body) return null
  return `${active.tagName.toLowerCase()} ${accessibleName(active)}`
}

/** The + of the row and the line under it, as a person finds them. */
function plus(view: HTMLElement) {
  const limit =
    'A workspace holds up to 10 terminals. Close one to open another.'
  return {
    off: byRole('button', 'New terminal', view).matches(':disabled'),
    line: queryByText(limit, view) !== null,
  }
}

describe('the terminal tabs', () => {
  test('the + opens a terminal and shows it, and the address and the saved view follow it', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { events, opened } = socketsOf(server)
    const { view, navigation } = await openTab(server, toolAddress, { events })
    const from = server.requests.length

    await press(byRole('button', 'New terminal', view))
    await waitFor(() => terminalTabs(view).names.length === 2, 'the new tab')
    const state = await server.fetch(terminalPaths.connection(org, id))
    const listed: TerminalResponse = await state.json()
    const second = listed.terminals?.[1]

    expect(terminalTabs(view)).toEqual({
      names: ['Terminal 1', 'Terminal 2'],
      shown: ['Terminal 2'],
    })
    expect(
      await bodiesOf(server, 'POST', terminalPaths.terminals(org, id), from),
    ).toEqual([{}])
    expect(navigation.history).toEqual([
      toolAddress,
      terminalHref(org, id, second?.id ?? ''),
    ])
    const saves = await bodiesOf(server, 'PUT', viewPath, from)
    expect(saves.map(terminalOf)).toEqual([second?.id])
    // Terminal 1 keeps its connection while Terminal 2 shows.
    expect(opened.map(({ path, socket }) => [path, socket.closed])).toEqual([
      [firstTerminal.socketPath, false],
      [second?.socketPath, false],
    ])
  })

  test('a press on a tab shows its terminal at once, keeps the hidden one connected, and connects a terminal only at its first show', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const [, third] = await openTerminals(server, 2)
    const { events, opened } = socketsOf(server)
    const here = routes.workspace(org, id)
    const { view, navigation } = await openTab(server, here, { events })
    const from = server.requests.length

    await press(byRole('link', 'Terminal 3', view))
    const shown = terminalTabs(view).shown
    await press(byRole('link', 'Terminal 1', view))

    expect(shown).toEqual(['Terminal 3'])
    expect(terminalTabs(view)).toEqual({
      names: ['Terminal 1', 'Terminal 2', 'Terminal 3'],
      shown: ['Terminal 1'],
    })
    // Terminal 2 never showed, so it opened no connection.
    expect(opened.map(({ path, socket }) => [path, socket.closed])).toEqual([
      [firstTerminal.socketPath, false],
      [third.socketPath, false],
    ])
    // On desktop, the address keeps the tab of the centre.
    expect(navigation.history).toEqual([here])
    const saves = await bodiesOf(server, 'PUT', viewPath, from)
    expect(saves.map(terminalOf)).toEqual([third.id, firstTerminal.id])
  })

  test('a close asks first, ends the terminal, and the terminal before it takes its place in the address', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const [second, third] = await openTerminals(server, 2)
    const closePath = terminalPaths.terminal(org, id, third.id)
    const { view, navigation } = await openTab(
      server,
      terminalHref(org, id, third.id),
    )
    const from = server.requests.length

    await press(byRole('button', 'Close Terminal 3', view))
    const question = byRole('dialog', 'Close Terminal 3?')
    expect(question.textContent).toContain(
      'Its shell and any running commands end for everyone in this workspace.',
    )
    await press(byRole('button', 'Cancel', question))
    // Cancel keeps the terminal.
    expect({
      question: queryByRole('dialog', 'Close Terminal 3?'),
      closes: await bodiesOf(server, 'DELETE', closePath, from),
    }).toEqual({ question: null, closes: [] })
    await press(byRole('button', 'Close Terminal 3', view))
    const again = byRole('dialog', 'Close Terminal 3?')
    await press(byRole('button', 'Close terminal', again))
    await waitFor(() => terminalTabs(view).names.length === 2, 'the close')

    expect(await bodiesOf(server, 'DELETE', closePath, from)).toEqual([{}])
    expect(terminalTabs(view)).toEqual({
      names: ['Terminal 1', 'Terminal 2'],
      shown: ['Terminal 2'],
    })
    expect(navigation.history).toEqual([terminalHref(org, id, second.id)])
  })

  test.each([
    { layout: 'desktop', viewport: 'desktop' },
    { layout: 'a phone', viewport: 'phone' },
  ] as const)(
    'on $layout, a cancel gives the focus back to the close button, and a confirmed close gives it to the tab of the terminal that now shows',
    async ({ viewport }) => {
      holdAnimationFrames()
      const server = new FakeApiServer()
      const [, third] = await openTerminals(server, 2)
      const here = terminalHref(org, id, third.id)
      const { view } = await openTab(server, here, { viewport })
      const question = () => byRole('dialog', 'Close Terminal 3?')

      // A person moves to the close button with the keyboard and presses it.
      click(byRole('button', 'Close Terminal 3', view))
      click(byRole('button', 'Cancel', question()))
      const afterCancel = focused()
      click(byRole('button', 'Close Terminal 3', view))
      click(byRole('button', 'Close terminal', question()))
      await waitFor(() => terminalTabs(view).names.length === 2, 'the close')

      expect(afterCancel).toBe('button Close Terminal 3')
      expect(focused()).toBe('a Terminal 2')
    },
  )

  test('a close of the shown terminal by another member removes its tab, and the next terminal shows in place of the first', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const [second] = await openTerminals(server, 2)
    const { events, opened } = socketsOf(server)
    const here = terminalHref(org, id, firstTerminal.id)
    const { view, navigation } = await openTab(server, here, { events })

    await closeElsewhere(server, firstTerminal)

    expect(terminalTabs(view)).toEqual({
      names: ['Terminal 2', 'Terminal 3'],
      shown: ['Terminal 2'],
    })
    expect(navigation.history).toEqual([terminalHref(org, id, second.id)])
    // The screen of the closed terminal closed its socket.
    expect(opened.map(({ path, socket }) => [path, socket.closed])).toEqual([
      [firstTerminal.socketPath, true],
      [second.socketPath, false],
    ])
  })

  test('at the limit the + is off and a line says how to open another, also on a phone', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const opened = await openTerminals(server, 9)
    const { view } = await openTab(server, toolAddress, { viewport: 'phone' })
    const atLimit = plus(view)

    await closeElsewhere(server, opened[8])

    expect(atLimit).toEqual({ off: true, line: true })
    expect(plus(view)).toEqual({ off: false, line: false })
  })

  test('a failed open shows the failure toast with the message of the server, and the terminals stay', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('POST', terminalPaths.terminals(org, id), failure, 503)
    const { view, navigation } = await openTab(server, toolAddress)

    await press(byRole('button', 'New terminal', view))
    await waitFor(() => shownToasts().length > 0, 'the toast')

    expect(shownToasts().map((toast) => toast.textContent)).toEqual([
      "The new terminal didn't open.The cloud computer did not answer. Try again.",
    ])
    expect(terminalTabs(view)).toEqual({
      names: ['Terminal 1'],
      shown: ['Terminal 1'],
    })
    expect(plus(view)).toEqual({ off: false, line: false })
    expect(navigation.history).toEqual([toolAddress])
  })

  test('a failed close shows the failure toast with the name of the terminal, and keeps the terminal', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const [second] = await openTerminals(server, 1)
    const closePath = terminalPaths.terminal(org, id, second.id)
    server.json('DELETE', closePath, failure, 503)
    const { view } = await openTab(server, terminalHref(org, id, second.id))

    await press(byRole('button', 'Close Terminal 2', view))
    const question = byRole('dialog', 'Close Terminal 2?')
    await press(byRole('button', 'Close terminal', question))
    await waitFor(() => shownToasts().length > 0, 'the toast')

    expect(shownToasts().map((toast) => toast.textContent)).toEqual([
      "Terminal 2 didn't close.The cloud computer did not answer. Try again.",
    ])
    expect(terminalTabs(view)).toEqual({
      names: ['Terminal 1', 'Terminal 2'],
      shown: ['Terminal 2'],
    })
  })
})
