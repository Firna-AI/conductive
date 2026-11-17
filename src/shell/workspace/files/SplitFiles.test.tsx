// @vitest-environment happy-dom

import { expect, test, vi } from 'vitest'
import column from '../../../../docs/mockups/src/components/workspace/RightColumn.module.css'
import { routes } from '../../../app/router'
import type { FilesTab } from '../../../files/navigation'
import {
  workspaceViewPath,
  type WorkspaceView,
} from '../../../shared/workspace-view'
import {
  accessibleName,
  byLabel,
  byRole,
  queryByRole,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { openTab } from '../wiring-test-kit'
import { savedViews } from './temporary-tabs.test-support'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const [first, second] = workspaceFixtures().view.view.panes[0].tabs
const form: FilesTab = { kind: 'file', path: FAKE_FILE_PATH, mode: 'preview' }
const readme: FilesTab = {
  kind: 'file',
  path: 'docs/README.md',
  mode: 'preview',
}

/** The tabs of the row of the right pane, the current one in brackets. */
function rightTabs(view: HTMLElement): string[] {
  const row = byLabel('Sessions and files of the right pane', view)
  return Array.from(row.querySelectorAll('li'), (item) => {
    const control = item.querySelector('a, button')
    const name = control ? accessibleName(control) : ''
    return control?.getAttribute('aria-current') === 'page' ? `[${name}]` : name
  })
}

test('a pane of a split shows its own file page beside a chat, the right column gives way, and a close of its shown file tab shows the next tab of that pane while the address stays', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer()
  const saved: WorkspaceView = {
    fileList: 'all',
    tool: 'terminal',
    panes: [
      { tabs: [first, second], activeTab: first, temporaryTab: null },
      { tabs: [form, readme], activeTab: form, temporaryTab: null },
    ],
    focusedPane: 0,
  }
  server.json('GET', workspaceViewPath(org, id), { view: saved })
  const home = routes.workspace(org, id)
  const { view, navigation } = await openTab(server, home)
  const from = server.requests.length
  const pane = (side: 'Left pane' | 'Right pane') => byLabel(side, view)
  const loaded = {
    tabs: rightTabs(view),
    page: queryByRole('region', 'AddressForm.tsx', pane('Right pane')) !== null,
    chat: queryByRole('textbox', 'Message', pane('Left pane')) !== null,
    split: byLabel('Files and tools', view).classList.contains(column.split),
  }
  click(byRole('button', 'Close AddressForm.tsx', pane('Right pane')))
  await settle()
  expect({
    loaded,
    tabs: rightTabs(view),
    page: queryByRole('region', 'README.md', pane('Right pane')) !== null,
    address: navigation.href(),
    saved: (await savedViews(server, from)).at(-1),
  }).toEqual({
    loaded: {
      tabs: ['[AddressForm.tsx]', 'README.md'],
      page: true,
      chat: true,
      split: true,
    },
    tabs: ['[README.md]'],
    page: true,
    address: home,
    // The press on Close in the right pane also makes it the focused pane.
    saved: {
      ...saved,
      panes: [
        saved.panes[0],
        { tabs: [readme], activeTab: readme, temporaryTab: null },
      ],
      focusedPane: 1,
    },
  })
})
