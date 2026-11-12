// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { nameLabel } from '../../../shared/name-label'
import { routes } from '../../../app/router'
import {
  layOut,
  pointer,
  rowStatus,
} from '../../../chat/components/tab-drag-test-kit'
import {
  menuItems,
  rightClick,
} from '../../../chat/components/tab-row-test-kit'
import type { FilesTab } from '../../../files/navigation'
import { sessionsPath } from '../../../shared/sessions'
import { workspaceViewPath } from '../../../shared/workspace-view'
import { workspacePaths } from '../../../shared/workspaces'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { MASKED_SEED_PATH } from '../../../test-support/fixtures/masked-paths'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
} from '../../../test-support/mount'
import { serveSuspendedAcme } from '../../../test-support/suspended-org'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { currents, linkTo, openTab } from '../wiring-test-kit'
import { filesHref } from './files-address'

/** The name that the tab of the second session of the fixtures shows. */
const debounce = nameLabel(
  workspaceFixtures('ready').sessions.sessions[1].title,
)

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const fileTab: FilesTab = {
  kind: 'file',
  path: FAKE_FILE_PATH,
  mode: 'preview',
}
const fileName = 'AddressForm.tsx'

/** The views that the tab saved, from the request with index `from` on. */
function savedViews(server: FakeApiServer, from: number): Promise<unknown[]> {
  return bodiesOf(server, 'PUT', workspaceViewPath(org, id), from)
}

describe('the Files screens in the workspace', () => {
  test('open a file beside the sessions, and its session tab goes back to the chat while the saved view keeps the file and the list', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
    )
    const fixtures = workspaceFixtures()
    const session = fixtures.sessions.sessions.find(
      (item) => item.id === FAKE_IDS.session,
    )
    if (!session) throw new Error('The fake workspace has no shown session.')
    const from = server.requests.length
    const panel = byLabel('Files and tools', view)
    click(linkTo(panel, filesHref(org, id, { kind: 'list', list: 'all' })))
    await settle()
    click(linkTo(byLabel('All files', panel), filesHref(org, id, fileTab)))
    await settle()

    const tabs = byLabel('Sessions and files', view)
    const fileHref = filesHref(org, id, fileTab)
    expect(navigation.href()).toBe(fileHref)
    expect(queryByRole('region', fileName, view)).not.toBeNull()
    expect(queryByRole('region', 'Chat', view)).toBeNull()
    expect(currents(tabs, fileHref)).toEqual(['page'])
    expect(
      byRole('button', nameLabel(session.title), tabs).getAttribute(
        'aria-current',
      ),
    ).toBeNull()

    click(byRole('button', nameLabel(session.title), tabs))
    await settle()

    expect(navigation.href()).toBe(routes.workspace(org, id))
    expect(queryByRole('region', 'Chat', view)).not.toBeNull()
    expect(queryByRole('region', fileName, view)).toBeNull()
    expect(
      byRole('button', nameLabel(session.title), tabs).getAttribute(
        'aria-current',
      ),
    ).toBe('page')
    expect(currents(tabs, fileHref)).toEqual([null])
    // The last save is the chat's own, when it showed the session again.
    const saved = await savedViews(server, from)
    expect(saved.at(-1)).toEqual({
      tabs: [...fixtures.view.view.tabs, fileTab],
      activeTab: { kind: 'session', sessionId: FAKE_IDS.session },
      temporaryTab: null,
      fileList: 'all',
      tool: 'terminal',
    })
  })

  test('name the tab, its tab menu, the status of the row, and the page of a file by the label of its path, and keep its address on the real path', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ paths: 'masked' })
    const tab: FilesTab = { kind: 'diff', path: MASKED_SEED_PATH }
    const href = filesHref(org, id, tab)
    const { view } = await openTab(server, href)
    await settle()
    const row = byLabel('Sessions and files', view)
    const link = linkTo(row, href)
    const shown = {
      tab: link.textContent,
      tooltip: link.getAttribute('title'),
      page: queryByRole('region', 'seed-[redacted].sql', view) !== null,
      address: href.includes(MASKED_SEED_PATH),
    }

    rightClick(link, { clientX: 250, clientY: 12 })
    const menu = menuItems('seed-[redacted].sql changes')
    await press(byRole('menuitem', 'Move left'))
    await settle()
    const moved = rowStatus()
    layOut(
      byRole('button', 'Address autocomplete', row),
      link,
      byRole('button', debounce, row),
    )
    pointer(link, 'pointerdown', { pointerType: 'mouse', clientX: 150 })
    pointer(window, 'pointermove', { pointerType: 'mouse', clientX: 140 })
    pointer(window, 'pointermove', { pointerType: 'mouse', clientX: 20 })
    const dragging = rowStatus()
    await pressKey('Escape')

    expect({ ...shown, menu, moved, dragging }).toEqual({
      tab: 'seed-[redacted].sql',
      tooltip: 'scripts/seed-[redacted].sql',
      page: true,
      address: true,
      menu: [
        { name: 'Move left', off: false },
        { name: 'Move right', off: true },
      ],
      moved: 'seed-[redacted].sql changes moves to place 2 of 3',
      dragging: 'Moving seed-[redacted].sql changes to place 1 of 3',
    })
  })

  test('show a file address while the chat has not read the saved view, and save no view', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json(
      'GET',
      sessionsPath(org, id),
      { error: { code: 'unavailable', message: 'The chat did not load.' } },
      503,
    )
    const { view } = await openTab(server, filesHref(org, id, fileTab))

    expect(queryByRole('region', fileName, view)).not.toBeNull()
    expect(await savedViews(server, 0)).toEqual([])
  })

  test('on a phone, a file of a finished turn opens its diff in the Files tab, which leads back to Changes', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
      { viewport: 'phone' },
    )

    click(byRole('button', `Open the changes of ${FAKE_FILE_PATH}`, view))
    await settle()

    const diff = filesHref(org, id, { kind: 'diff', path: FAKE_FILE_PATH })
    const changes = filesHref(org, id, { kind: 'list', list: 'changes' })
    expect(navigation.href()).toBe(diff)
    click(linkTo(byRole('region', fileName, view), changes))
    await settle()
    expect(navigation.href()).toBe(changes)
    expect(queryByLabel('Changed files', view)).not.toBeNull()
  })

  test('in a suspended org, a click on a list changes the view in the tab only, and saves no view', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const { view } = await openTab(server, routes.workspace(org, id))
    const panel = byLabel('Files and tools', view)
    const checks = filesHref(org, id, { kind: 'list', list: 'checks' })
    click(linkTo(panel, checks))
    await settle()

    expect({
      current: currents(panel, checks),
      saved: await savedViews(server, 0),
    }).toEqual({ current: ['page'], saved: [] })
  })

  test('keep the lists of a stopped sandbox, and show the sandbox in their place while it starts or the app refuses its start', async () => {
    holdAnimationFrames()
    const here = routes.workspace(org, id)
    const refusedServer = new FakeApiServer({ workspaceState: 'stopped' })
    refusedServer.json(
      'POST',
      workspacePaths.resume(org, id),
      { error: { code: 'user_suspended', message: 'The owner is suspended.' } },
      403,
    )
    const stopped = await openTab(
      new FakeApiServer({ workspaceState: 'stopped' }),
      here,
    )
    const starting = await openTab(
      new FakeApiServer({ workspaceState: 'starting' }),
      here,
    )
    const refused = await openTab(refusedServer, here)

    const column = (view: HTMLElement) => byLabel('Files and tools', view)
    const lists = (view: HTMLElement) =>
      queryByLabel('Changed files', column(view))
    expect(lists(stopped.view)).not.toBeNull()
    expect(lists(starting.view)).toBeNull()
    expect(column(starting.view).textContent).toContain(
      'Waiting for the sandbox',
    )
    expect(lists(refused.view)).toBeNull()
    expect(column(refused.view).textContent).toContain(
      "The sandbox can't start",
    )
  })

  test('keep only the chat of an archived workspace, also at a file address', async () => {
    holdAnimationFrames()
    const archived = await openTab(
      new FakeApiServer({ workspaceState: 'archived' }),
      filesHref(org, id, fileTab),
    )

    expect(queryByRole('region', 'Chat', archived.view)).not.toBeNull()
    expect(queryByRole('region', fileName, archived.view)).toBeNull()
    expect(queryByLabel('Changed files', archived.view)).toBeNull()
  })
})
