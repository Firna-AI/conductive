// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { readView } from '../../../chat/api/read-view'
import { terminalPaths, type TerminalResponse } from '../../../shared/terminal'
import { workspaceViewPath } from '../../../shared/workspace-view'
import screenStyles from '../../../terminal/TerminalScreen.module.css'
import { byRole, queryByLabel } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import { layOut } from '../../../test-support/layout'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { pressCommand } from '../../shortcuts/shortcut-test-kit'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { openTab, socketsOf } from '../wiring-test-kit'
import { firstTerminal, openTerminals, terminalTabs } from './terminal-tabs-kit'
import { previewPortHref } from './tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

// happy-dom lays out nothing, and a terminal screen opens only in a host
// with a size. Each shown terminal gets the size of the tools panel.
beforeEach(() => layOut(`.${screenStyles.host}`, { width: 440, height: 389 }))

const { org, workspace: id } = FAKE_IDS
const viewPath = workspaceViewPath(org, id)

/** The address of the Preview tab of port 3000, in the centre row. */
const previewTab = previewPortHref(org, id, 3000)

/** The page of the Preview tab of port 3000. */
const pageOf = (view: HTMLElement) =>
  view.querySelector('iframe[title="Preview of port 3000"]')

/** Whether the focus is in the xterm.js screen of the shown terminal. */
function focusInShownTerminal(view: HTMLElement): boolean {
  const active = document.activeElement
  if (!active || !view.contains(active)) return false
  return !!active.closest('.xterm') && active.closest('[hidden]') === null
}

/** Whether the Terminal tool shows two terminal tabs, as after an open. */
function twoTabs(view: HTMLElement): boolean {
  if (queryByLabel('Terminals', view) === null) return false
  return terminalTabs(view).names.length === 2
}

/** The shown terminal and the Preview tab of a save, as the route reads them. */
function savedOf(body: unknown) {
  const saved = readView({ view: body })
  return {
    terminal: saved.terminal,
    previews: saved.tabs.filter((tab) => tab.kind === 'preview'),
    active: saved.activeTab,
  }
}

/** The save of the view with the Preview tab of port 3000 open and active. */
const withPreviewTab = (terminal: string) => ({
  terminal,
  previews: [{ kind: 'preview', port: 3000 }],
  active: { kind: 'preview', port: 3000 },
})

describe('the terminal tabs while a Preview tab of the centre shows', () => {
  test('on desktop, the saved terminal shows, and a click on a terminal tab shows and saves it, moves the focus, and keeps the address of the Preview tab', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const [second] = await openTerminals(server, 1)
    server.json('GET', viewPath, {
      view: { ...workspaceFixtures().view.view, terminal: second.id },
    })
    const { events, opened } = socketsOf(server)
    const { view, navigation } = await openTab(server, previewTab, { events })
    await waitFor(() => pageOf(view), 'the page of port 3000')
    const before = {
      shown: terminalTabs(view).shown,
      sockets: opened.map(({ path }) => path),
    }
    const from = server.requests.length

    click(byRole('link', 'Terminal 1', view))
    await settle()
    const saves = await bodiesOf(server, 'PUT', viewPath, from)

    expect({
      before,
      shown: terminalTabs(view).shown,
      focus: focusInShownTerminal(view),
      history: navigation.history,
      saved: savedOf(saves.at(-1)),
    }).toEqual({
      before: { shown: ['Terminal 2'], sockets: [second.socketPath] },
      shown: ['Terminal 1'],
      focus: true,
      history: [previewTab],
      saved: withPreviewTab(firstTerminal.id),
    })
  })

  test('on desktop, New terminal of the palette shows the new terminal, moves the focus into it, and keeps the address of the Preview tab', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openPaletteTab(previewTab, {
      server,
      events: socketsOf(server).events,
    })
    await waitFor(() => pageOf(view), 'the page of port 3000')
    const from = server.requests.length

    pressCommand('command-palette', 'other', document.body)
    click(byRole('option', 'New terminal'))
    await waitFor(() => twoTabs(view), 'a second terminal tab')
    await settle()
    const saves = await bodiesOf(server, 'PUT', viewPath, from)
    const state = await server.fetch(terminalPaths.connection(org, id))
    const listed: TerminalResponse = await state.json()

    expect({
      shown: terminalTabs(view).shown,
      focus: focusInShownTerminal(view),
      history: navigation.history,
      saved: savedOf(saves.at(-1)),
    }).toEqual({
      shown: ['Terminal 2'],
      focus: true,
      history: [previewTab],
      saved: withPreviewTab(listed.terminals?.[1]?.id ?? 'no second terminal'),
    })
  })
})
