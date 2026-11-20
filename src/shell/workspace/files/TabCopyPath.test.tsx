// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { requestLines } from '../../../app/test-kit'
import {
  menuItems,
  rightClick,
} from '../../../chat/components/tab-row-test-kit'
import type { FilesTab } from '../../../files/navigation'
import { filePaths } from '../../../shared/files'
import {
  workspaceViewPath,
  type WorkspaceTab,
} from '../../../shared/workspace-view'
import {
  byLabel,
  byRole,
  queryAllByRole,
  queryByRole,
  shownToasts,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { MASKED_GONE_PATH } from '../../../test-support/fixtures/masked-paths'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
} from '../../../test-support/mount'
import {
  orgSuspendedBody,
  serveSuspendedAcme,
} from '../../../test-support/suspended-org'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { settle } from '../../test-mount'
import { linkTo } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const [first, second] = workspaceFixtures().view.view.tabs
const form: FilesTab = { kind: 'file', path: FAKE_FILE_PATH, mode: 'preview' }
const formDiff: FilesTab = { kind: 'diff', path: FAKE_FILE_PATH }
/** A tab of a file that no list names, so its label is not known. */
const gone: FilesTab = {
  kind: 'file',
  path: MASKED_GONE_PATH,
  mode: 'preview',
}

/** A clipboard that keeps each copied text. */
function clipboard() {
  const copied: string[] = []
  const copy = async (text: string | Promise<string>) => {
    copied.push(await text)
  }
  return { copied, copy }
}

/** Serves a saved view with these tabs, and the first session shown. */
function serveView(server: FakeApiServer, tabs: readonly WorkspaceTab[]) {
  server.json('GET', workspaceViewPath(org, id), {
    view: {
      tabs,
      activeTab: first,
      temporaryTab: null,
      fileList: 'all',
      tool: 'terminal',
    },
  })
}

/** The items of the open tab menu with this title, and its lines. */
function openMenu(title: string) {
  const lines = queryByRole('menu', title)?.querySelectorAll('hr').length
  return { items: menuItems(title), lines }
}

/** The titles of the toasts that show. */
const toasts = () => shownToasts().map((toast) => toast.textContent)

describe('Copy path in the tab menu of a file or diff tab', () => {
  test('copies the path of the file of a kept diff tab from its own group before the moves, says "Path copied", and keeps the shown tab with no request', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveView(server, [first, formDiff, second])
    const { copied, copy } = clipboard()
    const here = routes.workspace(org, id)
    const { view, navigation } = await openPaletteTab(here, { server, copy })
    const from = requestLines(server).length
    const row = byLabel('Sessions and files', view)

    rightClick(linkTo(row, filesHref(org, id, formDiff)), {
      clientX: 150,
      clientY: 12,
    })
    const opened = openMenu('AddressForm.tsx changes')
    await press(byRole('menuitem', 'Copy path'))
    await settle()

    expect({
      opened,
      copied,
      toasts: toasts(),
      address: navigation.href(),
      requests: requestLines(server).slice(from),
    }).toEqual({
      opened: {
        items: [
          { name: 'Copy path', off: false },
          { name: 'Move left', off: false },
          { name: 'Move right', off: false },
          { name: 'Close other tabs', off: false },
          { name: 'Close tabs to the right', off: false },
        ],
        lines: 2,
      },
      copied: [FAKE_FILE_PATH],
      toasts: ['Path copied'],
      address: here,
      requests: [],
    })
  })

  test('in a read-only workspace, a file tab opens a menu with only Copy path, which copies its path, and a tab whose label is not known yet opens none', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ paths: 'masked' })
    serveSuspendedAcme(server)
    // As the Worker does, the suspended org refuses the file routes, so the
    // labels come from the stored events of the workspace.
    server.json('GET', filePaths.tree(org, id), orgSuspendedBody, 403)
    server.json('GET', filePaths.changes(org, id), orgSuspendedBody, 403)
    serveView(server, [first, form, gone, second])
    const { copied, copy } = clipboard()
    const here = routes.workspace(org, id)
    const { view } = await openPaletteTab(here, { server, copy })
    const row = byLabel('Sessions and files', view)

    rightClick(linkTo(row, filesHref(org, id, form)), {
      clientX: 150,
      clientY: 12,
    })
    const opened = openMenu('AddressForm.tsx')
    await press(byRole('menuitem', 'Copy path'))
    await settle()
    const unknown = {
      browserMenu: rightClick(linkTo(row, filesHref(org, id, gone))),
      menus: queryAllByRole('menu', 'File').length,
    }

    expect({
      opened,
      copied,
      toasts: toasts(),
      unknown,
      writes: requestLines(server).filter((line) => !line.startsWith('GET ')),
    }).toEqual({
      opened: { items: [{ name: 'Copy path', off: false }], lines: 0 },
      copied: [FAKE_FILE_PATH],
      toasts: ['Path copied'],
      unknown: { browserMenu: true, menus: 0 },
      writes: [],
    })
  })
})
