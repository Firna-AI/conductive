// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { rowStatus } from '../../../chat/components/tab-drag-test-kit'
import {
  focused,
  menuItems,
  rightClick,
} from '../../../chat/components/tab-row-test-kit'
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
  press,
} from '../../../test-support/mount'
import { settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { linkTo, openTab, tabNames } from '../wiring-test-kit'
import { filesHref } from './files-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const [first, second] = workspaceFixtures().view.view.tabs
const [autocomplete, debounce] = workspaceFixtures().sessions.sessions.map(
  (session) => nameLabel(session.title),
)
const form: FilesTab = { kind: 'file', path: FAKE_FILE_PATH, mode: 'preview' }

describe('the tab menu of the temporary tab in the workspace', () => {
  test('Keep open keeps the temporary tab in its place with an upright title, gives the focus back to it, and says that it stays open, and the kept tab has no Keep open', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const viewPath = workspaceViewPath(org, id)
    const saved: WorkspaceView = {
      tabs: [first, form, second],
      activeTab: first,
      temporaryTab: { kind: 'file', path: FAKE_FILE_PATH },
      fileList: 'all',
      tool: 'terminal',
    }
    server.json('GET', viewPath, { view: saved })
    const { view } = await openTab(server, routes.workspace(org, id))
    const tab = linkTo(
      byLabel('Sessions and files', view),
      filesHref(org, id, form),
    )
    const from = server.requests.length

    rightClick(tab, { clientX: 150, clientY: 12 })
    const temporaryMenu = menuItems('AddressForm.tsx')
    await press(byRole('menuitem', 'Keep open'))
    await settle()
    const kept = {
      names: tabNames(view),
      focus: focused(),
      status: rowStatus(),
    }
    rightClick(tab, { clientX: 150, clientY: 12 })

    expect({
      temporaryMenu,
      ...kept,
      keptMenu: menuItems('AddressForm.tsx'),
      saved: await bodiesOf(server, 'PUT', viewPath, from),
    }).toEqual({
      temporaryMenu: [
        { name: 'Keep open', off: false },
        { name: 'Move left', off: false },
        { name: 'Move right', off: false },
      ],
      names: [autocomplete, 'AddressForm.tsx', debounce],
      focus: 'AddressForm.tsx',
      status: 'AddressForm.tsx stays open',
      keptMenu: [
        { name: 'Move left', off: false },
        { name: 'Move right', off: false },
      ],
      saved: [{ ...saved, temporaryTab: null }],
    })
  })
})
