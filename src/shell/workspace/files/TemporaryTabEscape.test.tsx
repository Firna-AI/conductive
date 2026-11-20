// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import {
  menuItems,
  rightClick,
} from '../../../chat/components/tab-row-test-kit'
import type { FilesTab } from '../../../files/navigation'
import { nameLabel } from '../../../shared/name-label'
import {
  workspaceViewPath,
  type WorkspaceView,
} from '../../../shared/workspace-view'
import { byLabel } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, press, settle } from '../../test-mount'
import { savedViewsOf } from '../kept-test-kit'
import { linkTo, openTab, tabNames } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const [first, second] = workspaceFixtures().view.view.tabs
const [autocomplete, debounce] = workspaceFixtures().sessions.sessions.map(
  (session) => nameLabel(session.title),
)
const form: FilesTab = { kind: 'file', path: FAKE_FILE_PATH, mode: 'preview' }
const readme: FilesTab = {
  kind: 'file',
  path: 'docs/README.md',
  mode: 'preview',
}

/** Serves the saved view, then opens the app at `href`. */
async function openWith(saved: WorkspaceView, href: string) {
  holdAnimationFrames()
  const server = new FakeApiServer()
  server.json('GET', workspaceViewPath(org, id), { view: saved })
  return { server, ...(await openTab(server, href)) }
}

describe('Escape on the temporary tab in the workspace', () => {
  test('Escape from the page closes the shown temporary tab as its Close does, and Escape in its open tab menu closes only the menu', async () => {
    const saved: WorkspaceView = {
      tabs: [first, second],
      activeTab: first,
      temporaryTab: null,
      fileList: 'all',
      tool: 'terminal',
    }
    const { server, view, navigation } = await openWith(
      saved,
      routes.workspace(org, id),
    )
    const panel = byLabel('Files and tools', view)
    const row = linkTo(byLabel('All files', panel), filesHref(org, id, readme))
    click(row)
    await settle()
    const opened = tabNames(view)
    const from = server.requests.length

    const tab = linkTo(
      byLabel('Sessions and files', view),
      filesHref(org, id, readme),
    )
    rightClick(tab, { clientX: 150, clientY: 12 })
    const menu = menuItems('README.md').length > 0
    press(document.activeElement ?? document.body, 'Escape')
    await settle()
    const afterMenu = {
      menu: document.querySelector('[role="menu"]') !== null,
      names: tabNames(view),
    }
    const escape = press(row, 'Escape')
    await settle()

    expect({
      opened,
      menu,
      afterMenu,
      prevented: escape.defaultPrevented,
      closed: tabNames(view),
      address: navigation.href(),
      saved: await savedViewsOf(server, from),
    }).toEqual({
      opened: [autocomplete, debounce, 'README.md, temporary'],
      menu: true,
      afterMenu: {
        menu: false,
        names: [autocomplete, debounce, 'README.md, temporary'],
      },
      prevented: true,
      closed: [autocomplete, debounce],
      address: routes.workspace(org, id),
      saved: [{ ...saved, activeTab: first, temporaryTab: null }],
    })
  })

  test('Escape closes no tab while a kept tab shows, also when the row holds a temporary tab', async () => {
    const saved: WorkspaceView = {
      tabs: [first, form, second, readme],
      activeTab: form,
      temporaryTab: { kind: 'file', path: 'docs/README.md' },
      fileList: 'all',
      tool: 'terminal',
    }
    const formHref = filesHref(org, id, form)
    const { server, view, navigation } = await openWith(saved, formHref)
    const opened = tabNames(view)
    const from = server.requests.length

    const escape = press(document.body, 'Escape')
    await settle()

    expect({
      opened,
      prevented: escape.defaultPrevented,
      names: tabNames(view),
      address: navigation.href(),
      saved: await savedViewsOf(server, from),
    }).toEqual({
      opened: [
        autocomplete,
        'AddressForm.tsx',
        debounce,
        'README.md, temporary',
      ],
      prevented: false,
      names: [
        autocomplete,
        'AddressForm.tsx',
        debounce,
        'README.md, temporary',
      ],
      address: formHref,
      saved: [],
    })
  })
})
