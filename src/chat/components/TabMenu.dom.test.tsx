// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { testNavigation } from '../../files/files-test-kit'
import {
  byRole,
  queryAllByRole,
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
    layOut(tab, byRole('button', 'Debounce lookups'))
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
          { name: 'Move left', off: true },
          { name: 'Move right', off: false },
        ],
        place: { left: '0px', top: '34px' },
        focus: 'Rename session',
      },
    })

    await pressKey('ArrowDown')
    const afterArrow = focused()
    // Some browsers send their menu event to the focus after these keys.
    const browserMenu = rightClick(document.activeElement ?? document.body)
    const menus = queryAllByRole('menu', 'Address autocomplete').length
    await pressKey('Escape')

    expect({
      afterArrow,
      browserMenu,
      menus,
      closed: menuItems('Address autocomplete'),
      focus: focused(),
    }).toEqual({
      afterArrow: 'Move right',
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
    const fileTab = await waitFor(() => queryByText('app.ts'), 'the file tab')
    layOut(
      byRole('button', 'Address autocomplete'),
      byRole('button', 'Debounce lookups'),
      fileTab,
    )

    const browserMenu = rightClick(fileTab, { clientX: 250, clientY: 12 })
    expect({
      browserMenu,
      items: menuItems('app.ts'),
      place: menuPlace('app.ts'),
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
      closed: menuItems('app.ts'),
      shown: shownTab(),
    }).toEqual({
      saved: [[first, file, second]],
      row: ['Address autocomplete', 'app.ts', 'Debounce lookups'],
      status: 'app.ts moves to place 2 of 3',
      focus: 'app.ts',
      closed: [],
      shown: 'Address autocomplete',
    })
  })

  it('opens the rename field from Rename session in a tab that does not show, keeps the shown tab, and lets that tab neither drag nor open its menu', async () => {
    await mountChat({
      server: new FakeApiServer(),
      tabs: [first, second],
      viewport: 'desktop',
    })
    const tab = byRole('button', 'Debounce lookups')
    layOut(byRole('button', 'Address autocomplete'), tab)

    rightClick(tab, { clientX: 150, clientY: 12 })
    expect(menuItems('Debounce lookups')).toEqual([
      { name: 'Rename session', off: false },
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
      menu: menuItems('Debounce lookups'),
    }).toEqual({
      value: 'Debounce lookups',
      focus: 'Session name',
      row: ['Address autocomplete', ''],
      shown: 'Address autocomplete',
      drag: '',
      browserMenu: true,
      menu: [],
    })
  })
})
