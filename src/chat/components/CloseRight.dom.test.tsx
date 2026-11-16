// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { testNavigation } from '../../files/files-test-kit'
import { sessionPaths } from '../../shared/sessions'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import {
  debounce,
  file,
  fileTabs,
  first,
  layOut,
  mountChat,
  rowTitles,
  savedOrders,
  second,
  settle,
  shownTab,
  temporaryFile,
} from './tab-drag-test-kit'
import { menuItems, rightClick } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const closePath = sessionPaths.close(
  FAKE_IDS.org,
  FAKE_IDS.workspace,
  'debounce',
)

/** The fake API answers the close of the second session with its record. */
function answerClose(server: FakeApiServer) {
  const record = workspaceFixtures().sessions.sessions[1]
  server.json('POST', closePath, {
    session: { ...record, closedAt: FAKE_TIME },
    eventNumber: server.events.history().throughEventNumber + 1,
  })
}

/** The bodies of the session closes that the fake API got. */
function closes(server: FakeApiServer): Promise<unknown[]> {
  return Promise.all(
    server.requests
      .filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname === closePath,
      )
      .map((request) => request.clone().json()),
  )
}

/** Mounts the row with a session tab, the temporary file tab, and a session tab. */
async function mountRow(server: FakeApiServer) {
  await mountChat({
    server,
    tabs: [first, file, second],
    temporaryTab: temporaryFile,
    viewport: 'desktop',
    renderTab: fileTabs(testNavigation(), temporaryFile),
  })
  const fileTab = await waitFor(
    () => queryByText('app-[redacted].ts'),
    'the file tab',
  )
  layOut(
    byRole('button', 'Address autocomplete'),
    fileTab,
    byRole('button', debounce),
  )
  return fileTab
}

describe('Close tabs to the right', () => {
  it('closes each file and session tab after the tab, saves one view without the file tab and its mark, and keeps the shown tab', async () => {
    const server = new FakeApiServer()
    answerClose(server)
    await mountRow(server)

    rightClick(byRole('button', 'Address autocomplete'), {
      clientX: 20,
      clientY: 12,
    })
    const items = menuItems('Address autocomplete').slice(-1)
    await press(byRole('menuitem', 'Close tabs to the right'))
    await waitFor(() => !queryByText(debounce), 'the closed session')
    await settle()

    const orders = await savedOrders(server)
    expect({
      items,
      closes: await closes(server),
      firstSave: orders[0],
      row: rowTitles(),
      shown: shownTab(),
    }).toEqual({
      items: [{ name: 'Close tabs to the right', off: false }],
      closes: [{ stopRunningTurn: false }],
      firstSave: [first, second],
      row: ['Address autocomplete'],
      shown: 'Address autocomplete',
    })
  })

  it('shows the tab of the menu first when the shown tab is to its right', async () => {
    const server = new FakeApiServer()
    answerClose(server)
    const fileTab = await mountRow(server)
    await press(byRole('button', debounce))
    await waitFor(() => shownTab() === debounce, 'the second session')

    rightClick(fileTab, { clientX: 150, clientY: 12 })
    await press(byRole('menuitem', 'Close tabs to the right'))
    await waitFor(() => !queryByText(debounce), 'the closed session')
    await settle()

    expect({
      closes: await closes(server),
      row: rowTitles(),
    }).toEqual({
      closes: [{ stopRunningTurn: false }],
      row: ['Address autocomplete', 'app-[redacted].ts'],
    })
  })

  it('is off on the last tab', async () => {
    await mountRow(new FakeApiServer())

    rightClick(byRole('button', debounce), { clientX: 250, clientY: 12 })

    expect(menuItems(debounce).slice(-1)).toEqual([
      { name: 'Close tabs to the right', off: true },
    ])
  })
})
