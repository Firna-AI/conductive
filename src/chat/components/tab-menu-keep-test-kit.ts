import { expect } from 'vitest'
import { testNavigation } from '../../files/files-test-kit'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { press, waitFor } from '../../test-support/mount'
import {
  debounce,
  file,
  fileTabs,
  first,
  mountChat,
  rowStatus,
  rowTitles,
  second,
  settle,
  temporaryFile,
  viewSaves,
} from './tab-drag-test-kit'
import { focused, menuItems, rightClick } from './tab-row-test-kit'

export async function keepTemporaryTab() {
  const server = new FakeApiServer()
  const navigation = testNavigation()
  await mountChat({
    server,
    tabs: [first, file, second],
    temporaryTab: temporaryFile,
    viewport: 'desktop',
    renderTab: fileTabs(navigation, temporaryFile),
  })
  const fileTab = await waitFor(
    () => queryByText('app-[redacted].ts'),
    'the file tab',
  )

  rightClick(fileTab, { clientX: 150, clientY: 12 })
  const menu = queryByRole('menu', 'app-[redacted].ts')
  const opened = {
    items: menuItems('app-[redacted].ts'),
    lines: menu?.querySelectorAll('hr').length,
  }
  await press(byRole('menuitem', 'Keep open'))
  await settle()

  // The host of the test keeps nothing, so the tab stays temporary.
  expect({
    opened,
    kept: navigation.kept,
    saves: viewSaves(server).length,
    row: rowTitles(),
    status: rowStatus(),
    focus: focused(),
    closed: menuItems('app-[redacted].ts'),
  }).toEqual({
    opened: {
      items: [
        { name: 'Keep open', off: false },
        { name: 'Move left', off: false },
        { name: 'Move right', off: false },
        { name: 'Close other tabs', off: false },
        { name: 'Close tabs to the right', off: false },
      ],
      lines: 2,
    },
    kept: [file],
    saves: 0,
    row: ['Address autocomplete', 'app-[redacted].ts', debounce],
    status: 'app-[redacted].ts stays open',
    focus: 'app-[redacted].ts, temporary',
    closed: [],
  })
}
