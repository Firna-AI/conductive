// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { testNavigation } from '../../files/files-test-kit'
import {
  byRole,
  queryAllByRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
  waitFor,
} from '../../test-support/mount'
import {
  debounce,
  file,
  fileTabs,
  first,
  layOut,
  mountChat,
  pointer,
  rowStatus,
  rowTitles,
  savedOrders,
  second,
  settle,
  shownTab,
  temporaryFile,
  viewSaves,
} from './tab-drag-test-kit'
import { focused, menuItems, pressOn, rightClick } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const mouse = { pointerType: 'mouse' }

/** Where the open menu with this label draws, from its own position. */
function menuPlace(label: string): { left: string; top: string } | null {
  const menu = queryAllByRole('menu', label)[0]
  return menu ? { left: menu.style.left, top: menu.style.top } : null
}

describe('the tab menu', () => {
  it('opens at a focused tab on Shift and F10 with Move left off on the first tab, skips the off item with the arrows, and opens once when the browser also sends its menu event', async () => {
    await mountChat({
      server: new FakeApiServer(),
      tabs: [first, second],
      viewport: 'desktop',
    })
    const tab = byRole('button', 'Address autocomplete')
    layOut(tab, byRole('button', debounce))
    act(() => tab.focus())

    const keyReachesBrowser = pressOn(tab, 'F10', { shiftKey: true })
    const opened = {
      items: menuItems('Address autocomplete'),
      place: menuPlace('Address autocomplete'),
      focus: focused(),
    }
    expect({ keyReachesBrowser, opened }).toEqual({
      keyReachesBrowser: false,
      opened: {
        items: [
          { name: 'Rename session', off: false },
          { name: 'Copy link', off: false },
          { name: 'Copy concise transcript', off: false },
          { name: 'Copy full transcript', off: false },
          { name: 'Move left', off: true },
          { name: 'Move right', off: false },
        ],
        place: { left: '0px', top: '34px' },
        focus: 'Rename session',
      },
    })

    const arrows: (string | null)[] = []
    for (let press = 0; press < 4; press += 1) {
      await pressKey('ArrowDown')
      arrows.push(focused())
    }
    // Some browsers send their menu event to the focus after these keys.
    const browserMenu = rightClick(document.activeElement ?? document.body)
    const menus = queryAllByRole('menu', 'Address autocomplete').length
    await pressKey('Escape')

    expect({
      arrows,
      browserMenu,
      menus,
      closed: menuItems('Address autocomplete'),
      focus: focused(),
    }).toEqual({
      arrows: [
        'Copy link',
        'Copy concise transcript',
        'Copy full transcript',
        'Move right',
      ],
      browserMenu: false,
      menus: 1,
      closed: [],
      focus: 'Address autocomplete',
    })
  })

  it('opens at the pointer on a right click of a file tab, and Move left moves the tab one place, saves the order, says the new place, and gives the focus back to the tab', async () => {
    const server = new FakeApiServer()
    await mountChat({
      server,
      tabs: [first, second, file],
      viewport: 'desktop',
      renderTab: fileTabs(testNavigation()),
    })
    const fileTab = await waitFor(
      () => queryByText('app-[redacted].ts'),
      'the file tab',
    )
    layOut(
      byRole('button', 'Address autocomplete'),
      byRole('button', debounce),
      fileTab,
    )

    const browserMenu = rightClick(fileTab, { clientX: 250, clientY: 12 })
    expect({
      browserMenu,
      items: menuItems('app-[redacted].ts'),
      place: menuPlace('app-[redacted].ts'),
    }).toEqual({
      browserMenu: false,
      items: [
        { name: 'Move left', off: false },
        { name: 'Move right', off: true },
      ],
      place: { left: '250px', top: '12px' },
    })

    await press(byRole('menuitem', 'Move left'))
    await settle()

    expect({
      saved: await savedOrders(server),
      row: rowTitles(),
      status: rowStatus(),
      focus: focused(),
      closed: menuItems('app-[redacted].ts'),
      shown: shownTab(),
    }).toEqual({
      saved: [[first, file, second]],
      row: ['Address autocomplete', 'app-[redacted].ts', debounce],
      status: 'app-[redacted].ts moves to place 2 of 3',
      focus: 'app-[redacted].ts',
      closed: [],
      shown: 'Address autocomplete',
    })
  })

  it('leads the menu of the temporary tab with Keep open and a line, and Keep open asks the host to keep the tab in its place, says that it stays open, and gives the focus back to the tab', async () => {
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
        ],
        lines: 1,
      },
      kept: [file],
      saves: 0,
      row: ['Address autocomplete', 'app-[redacted].ts', debounce],
      status: 'app-[redacted].ts stays open',
      focus: 'app-[redacted].ts, temporary',
      closed: [],
    })
  })

  it('leaves Keep open out of a read-only row, so the temporary tab opens no menu, and the browser shows its own', async () => {
    await mountChat({
      server: new FakeApiServer(),
      tabs: [first, file, second],
      temporaryTab: temporaryFile,
      viewport: 'desktop',
      renderTab: fileTabs(testNavigation(), temporaryFile),
      readOnly: true,
    })
    const fileTab = await waitFor(
      () => queryByText('app-[redacted].ts'),
      'the file tab',
    )

    expect({
      browserMenu: rightClick(fileTab, { clientX: 150, clientY: 12 }),
      keyReachesBrowser: pressOn(fileTab, 'F10', { shiftKey: true }),
      menus: queryAllByRole('menu', 'app-[redacted].ts').length,
    }).toEqual({ browserMenu: true, keyReachesBrowser: true, menus: 0 })
  })

  it('opens the rename field from Rename session in a tab that does not show, keeps the shown tab, and lets that tab neither drag nor open its menu', async () => {
    await mountChat({
      server: new FakeApiServer(),
      tabs: [first, second],
      viewport: 'desktop',
    })
    const tab = byRole('button', debounce)
    layOut(byRole('button', 'Address autocomplete'), tab)

    rightClick(tab, { clientX: 150, clientY: 12 })
    expect(menuItems(debounce)).toEqual([
      { name: 'Rename session', off: false },
      { name: 'Copy link', off: false },
      { name: 'Copy concise transcript', off: false },
      { name: 'Copy full transcript', off: false },
      { name: 'Move left', off: false },
      { name: 'Move right', off: true },
    ])
    await press(byRole('menuitem', 'Rename session'))

    const field = byRole('textbox', 'Session name')
    const value = field instanceof HTMLInputElement ? field.value : null
    const focus = focused()
    pointer(field, 'pointerdown', { ...mouse, clientX: 150 })
    pointer(window, 'pointermove', { ...mouse, clientX: 20 })
    const drag = rowStatus()
    pointer(window, 'pointerup', { ...mouse, clientX: 20, buttons: 0 })
    const browserMenu = rightClick(field, { clientX: 150, clientY: 12 })

    expect({
      value,
      focus,
      row: rowTitles(),
      shown: shownTab(),
      drag,
      browserMenu,
      menu: menuItems(debounce),
    }).toEqual({
      value: debounce,
      focus: 'Session name',
      row: ['Address autocomplete', ''],
      shown: 'Address autocomplete',
      drag: '',
      browserMenu: true,
      menu: [],
    })
  })
})
