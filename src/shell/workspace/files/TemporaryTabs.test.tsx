// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import type { FilesTab } from '../../../files/navigation'
import { nameLabel } from '../../../shared/name-label'
import {
  workspaceViewPath,
  type WorkspaceView,
} from '../../../shared/workspace-view'
import {
  accessibleName,
  byLabel,
  byRole,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { serveSuspendedAcme } from '../../../test-support/suspended-org'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { linkTo, openTab } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const [first, second] = workspaceFixtures().view.view.tabs
const [autocomplete, debounce] = workspaceFixtures().sessions.sessions.map(
  (session) => nameLabel(session.title),
)
const form: FilesTab = { kind: 'file', path: FAKE_FILE_PATH, mode: 'preview' }
const formDiff: FilesTab = { kind: 'diff', path: FAKE_FILE_PATH }
const readme: FilesTab = {
  kind: 'file',
  path: 'docs/README.md',
  mode: 'preview',
}
const page: FilesTab = {
  kind: 'file',
  path: 'src/app/checkout/page.tsx',
  mode: 'preview',
}

/** The views that the tab saved, from the request with index `from` on. */
function savedViews(server: FakeApiServer, from: number): Promise<unknown[]> {
  return bodiesOf(server, 'PUT', workspaceViewPath(org, id), from)
}

/** The temporary mark of a saved view, or "none" for a body without one. */
function markOf(body: unknown): unknown {
  return typeof body === 'object' && body !== null && 'temporaryTab' in body
    ? body.temporaryTab
    : 'none'
}

/** The name of each tab of the row, as a screen reader reads its control. */
function tabNames(view: HTMLElement): string[] {
  const row = byLabel('Sessions and files', view)
  return Array.from(row.querySelectorAll('li'), (item) => {
    const control = item.querySelector('a, button')
    return control ? accessibleName(control) : ''
  })
}

/** The link of All files or Changes, in the right column, to `tab`. */
function rowLink(view: HTMLElement, list: string, tab: FilesTab) {
  const panel = byLabel('Files and tools', view)
  return linkTo(byLabel(list, panel), filesHref(org, id, tab))
}

/**
 * A double-click of the mouse, as a browser sends it: a press and a click
 * with the count 1, a press and a click with the count 2, then the
 * double-click. The page settles after the first click, as it does between
 * two clicks. The result says, for each press, whether the page stopped
 * the action of the browser, which selects a word at the second press.
 */
async function doubleClick(target: HTMLElement): Promise<boolean[]> {
  const send = (type: string, detail: number) => {
    const init = { bubbles: true, cancelable: true, button: 0, detail }
    const event = new MouseEvent(type, init)
    act(() => {
      target.dispatchEvent(event)
    })
    return event.defaultPrevented
  }
  const stopped: boolean[] = []
  for (const detail of [1, 2]) {
    stopped.push(send('mousedown', detail))
    send('mouseup', detail)
    send('click', detail)
    if (detail === 1) await settle()
  }
  send('dblclick', 2)
  await settle()
  return stopped
}

describe('the temporary tab in the workspace', () => {
  test('load the saved temporary tab, replace it in its place at a press, keep it through a switch of mode, and clear the mark when it closes', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const saved: WorkspaceView = {
      tabs: [first, form, second],
      activeTab: first,
      temporaryTab: { kind: 'file', path: FAKE_FILE_PATH },
      fileList: 'all',
      tool: 'terminal',
    }
    server.json('GET', workspaceViewPath(org, id), { view: saved })
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
    )
    const loaded = tabNames(view)
    const from = server.requests.length

    click(rowLink(view, 'All files', readme))
    await settle()
    const replaced = tabNames(view)
    const address = navigation.href()
    click(byRole('radio', 'Source', byRole('region', 'README.md', view)))
    await settle()
    const switched = tabNames(view)
    click(byRole('button', 'Close README.md', view))
    await settle()

    const source: FilesTab = { ...readme, mode: 'source' }
    const mark = { kind: 'file', path: 'docs/README.md' }
    expect({
      loaded,
      replaced,
      address,
      switched,
      closed: tabNames(view),
      saved: await savedViews(server, from),
    }).toEqual({
      loaded: [autocomplete, 'AddressForm.tsx, temporary', debounce],
      replaced: [autocomplete, 'README.md, temporary', debounce],
      address: filesHref(org, id, readme),
      switched: [autocomplete, 'README.md, temporary', debounce],
      closed: [autocomplete, debounce],
      saved: [
        {
          ...saved,
          tabs: [first, readme, second],
          activeTab: readme,
          temporaryTab: mark,
        },
        {
          ...saved,
          tabs: [first, source, second],
          activeTab: source,
          temporaryTab: mark,
        },
        {
          ...saved,
          tabs: [first, second],
          activeTab: first,
          temporaryTab: null,
        },
      ],
    })
  })

  test('a double-click on a row of Changes or All files keeps the tab that the row opens, with one entry in the history and no text selection, and the next press opens a new temporary tab', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
    )
    const from = server.requests.length
    const before = navigation.history.length

    const diffPresses = await doubleClick(
      rowLink(view, 'Changed files', formDiff),
    )
    const diffHistory = navigation.history.slice(before)
    click(
      linkTo(
        byLabel('Files and tools', view),
        filesHref(org, id, { kind: 'list', list: 'all' }),
      ),
    )
    await settle()
    const middle = navigation.history.length
    await doubleClick(rowLink(view, 'All files', readme))
    const fileHistory = navigation.history.slice(middle)
    click(rowLink(view, 'All files', page))
    await settle()

    expect({
      diffPresses,
      diffHistory,
      fileHistory,
      names: tabNames(view),
      marks: (await savedViews(server, from)).map(markOf),
    }).toEqual({
      diffPresses: [false, true],
      diffHistory: [filesHref(org, id, formDiff)],
      fileHistory: [filesHref(org, id, readme)],
      names: [
        autocomplete,
        debounce,
        'AddressForm.tsx changes',
        'README.md',
        'page.tsx, temporary',
      ],
      marks: [
        { kind: 'diff', path: FAKE_FILE_PATH },
        null,
        null,
        { kind: 'file', path: 'docs/README.md' },
        null,
        { kind: 'file', path: 'src/app/checkout/page.tsx' },
      ],
    })
  })

  test('an address of a file with no tab opens it in the temporary tab, a session tab leaves it, and a double-click on the tab keeps it with one entry in the history', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const formHref = filesHref(org, id, form)
    const { view, navigation } = await openTab(server, formHref)
    const opened = tabNames(view)

    click(byRole('button', autocomplete, byLabel('Sessions and files', view)))
    await settle()
    const left = tabNames(view)
    const from = server.requests.length
    const before = navigation.history.length
    await doubleClick(linkTo(byLabel('Sessions and files', view), formHref))

    expect({
      opened,
      left,
      kept: tabNames(view),
      history: navigation.history.slice(before),
      saved: await savedViews(server, from),
    }).toEqual({
      opened: [autocomplete, debounce, 'AddressForm.tsx, temporary'],
      left: [autocomplete, debounce, 'AddressForm.tsx, temporary'],
      kept: [autocomplete, debounce, 'AddressForm.tsx'],
      history: [formHref],
      saved: [
        {
          tabs: [first, second, form],
          activeTab: form,
          temporaryTab: { kind: 'file', path: FAKE_FILE_PATH },
          fileList: 'changes',
          tool: 'terminal',
        },
        {
          tabs: [first, second, form],
          activeTab: form,
          temporaryTab: null,
          fileList: 'changes',
          tool: 'terminal',
        },
      ],
    })
  })

  test('in a suspended org, a press opens the temporary tab and a double-click on the tab keeps it, in the view of the browser tab only', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const { view } = await openTab(server, routes.workspace(org, id))
    const from = server.requests.length

    // The lists show the sandbox there, so the chip of the finished turn
    // opens the diff.
    click(byRole('button', `Open the changes of ${FAKE_FILE_PATH}`, view))
    await settle()
    const opened = tabNames(view)
    const row = byLabel('Sessions and files', view)
    await doubleClick(linkTo(row, filesHref(org, id, formDiff)))

    expect({
      opened,
      kept: tabNames(view),
      saved: await savedViews(server, from),
    }).toEqual({
      opened: [autocomplete, debounce, 'AddressForm.tsx changes, temporary'],
      kept: [autocomplete, debounce, 'AddressForm.tsx changes'],
      saved: [],
    })
  })
})
