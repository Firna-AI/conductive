// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import type { FilesTab } from '../../../files/navigation'
import { nameLabel } from '../../../shared/name-label'
import {
  workspaceViewPath,
  type WorkspaceView,
} from '../../../shared/workspace-view'
import { byLabel, byRole } from '../../../test-support/dom-queries'
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
import { linkTo, openTab, tabNames } from '../wiring-test-kit'
import { filesHref } from './files-address'
import {
  doubleClick,
  markOf,
  rowLink,
  savedViews,
} from './temporary-tabs.test-support'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const [first, second] = workspaceFixtures().view.view.panes[0].tabs
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

describe('the temporary tab in the workspace', () => {
  test('load the saved temporary tab, replace it in its place at a press, keep it through a switch of mode, and clear the mark when it closes', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const saved: WorkspaceView = {
      fileList: 'all',
      tool: 'terminal',
      panes: [
        {
          tabs: [first, form, second],
          activeTab: first,
          temporaryTab: { kind: 'file', path: FAKE_FILE_PATH },
        },
      ],
      focusedPane: 0,
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
          panes: [
            {
              ...saved.panes[0],
              tabs: [first, readme, second],
              activeTab: readme,
              temporaryTab: mark,
            },
          ],
          focusedPane: 0,
        },
        {
          ...saved,
          panes: [
            {
              ...saved.panes[0],
              tabs: [first, source, second],
              activeTab: source,
              temporaryTab: mark,
            },
          ],
          focusedPane: 0,
        },
        {
          ...saved,
          panes: [
            {
              ...saved.panes[0],
              tabs: [first, second],
              activeTab: first,
              temporaryTab: null,
            },
          ],
          focusedPane: 0,
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
          fileList: 'changes',
          tool: 'terminal',
          panes: [
            {
              tabs: [first, second, form],
              activeTab: form,
              temporaryTab: { kind: 'file', path: FAKE_FILE_PATH },
            },
          ],
          focusedPane: 0,
        },
        {
          fileList: 'changes',
          tool: 'terminal',
          panes: [
            {
              tabs: [first, second, form],
              activeTab: form,
              temporaryTab: null,
            },
          ],
          focusedPane: 0,
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
