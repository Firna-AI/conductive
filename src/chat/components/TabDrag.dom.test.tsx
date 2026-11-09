// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { testNavigation } from '../../files/files-test-kit'
import {
  byRole,
  byText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  MOUNTED_TEST_TIMEOUT,
  pressKey,
  waitFor,
} from '../../test-support/mount'
import {
  file,
  fileTabs,
  first,
  layOut,
  liftedCopy,
  mountChat,
  pointer,
  rowStatus,
  rowTitles,
  savedOrders,
  second,
  settle,
  shownTab,
  viewSaves,
} from './tab-drag-test-kit'
import { allowed, menuItems } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const mouse = { pointerType: 'mouse' }
const fingerClick = { bubbles: true, cancelable: true, detail: 1 }

describe('a drag in the tab row', () => {
  it('saves the order after a mouse drags a file tab before a session tab, and the click at the end of the drag shows nothing', async () => {
    const server = new FakeApiServer()
    const navigation = testNavigation()
    await mountChat({
      server,
      tabs: [first, second, file],
      viewport: 'desktop',
      renderTab: fileTabs(navigation),
    })
    const fileTab = await waitFor(() => queryByText('app.ts'), 'the file tab')
    layOut(
      byRole('button', 'Address autocomplete'),
      byRole('button', 'Debounce lookups'),
      fileTab,
    )

    pointer(fileTab, 'pointerdown', { ...mouse, clientX: 250 })
    pointer(window, 'pointermove', { ...mouse, clientX: 240 })
    pointer(window, 'pointermove', { ...mouse, clientX: 120 })
    const moving = rowStatus()
    const lifted = liftedCopy('app.ts')
    pointer(window, 'pointerup', { ...mouse, clientX: 120, buttons: 0 })
    act(() => byText('app.ts').click())
    await settle()

    expect({
      moving,
      lifted,
      saved: await savedOrders(server),
      row: rowTitles(),
      visited: navigation.visited,
      shown: shownTab(),
    }).toEqual({
      moving: 'Moving app.ts to place 2 of 3',
      lifted: true,
      saved: [[first, file, second]],
      row: ['Address autocomplete', 'app.ts', 'Debounce lookups'],
      visited: [],
      shown: 'Address autocomplete',
    })
  })

  it('keeps the order when Escape ends a drag, and the release after it shows nothing', async () => {
    const server = new FakeApiServer()
    await mountChat({ server, tabs: [first, second], viewport: 'desktop' })
    const tab = byRole('button', 'Debounce lookups')
    layOut(byRole('button', 'Address autocomplete'), tab)

    pointer(tab, 'pointerdown', { ...mouse, clientX: 150 })
    pointer(window, 'pointermove', { ...mouse, clientX: 140 })
    pointer(window, 'pointermove', { ...mouse, clientX: 20 })
    const moving = rowStatus()
    await pressKey('Escape')
    const afterEscape = rowStatus()
    pointer(window, 'pointerup', { ...mouse, clientX: 150, buttons: 0 })
    act(() => tab.click())
    await settle()

    expect({
      moving,
      afterEscape,
      saves: viewSaves(server).length,
      row: rowTitles(),
      shown: shownTab(),
    }).toEqual({
      moving: 'Moving Debounce lookups to place 1 of 2',
      afterEscape: '',
      saves: 0,
      row: ['Address autocomplete', 'Debounce lookups'],
      shown: 'Address autocomplete',
    })
  })

  it('lifts a session tab on a phone after a finger holds it 450 ms, and opens its tab menu as a sheet when the finger lets go without a move', async () => {
    const server = new FakeApiServer()
    await mountChat({ server, tabs: [first, second], viewport: 'mobile' })
    const tab = byRole('button', 'Debounce lookups')
    layOut(byRole('button', 'Address autocomplete'), tab)
    const finger = { pointerType: 'touch', pointerId: 2, clientX: 150 }

    vi.useFakeTimers()
    try {
      pointer(tab, 'pointerdown', finger)
      act(() => vi.advanceTimersByTime(449))
      const early = rowStatus()
      act(() => vi.advanceTimersByTime(1))
      const held = rowStatus()
      const lifted = liftedCopy('Debounce lookups')
      pointer(window, 'pointermove', { ...finger, clientX: 156 })
      pointer(window, 'pointerup', { ...finger, clientX: 156, buttons: 0 })
      // A finger sends its click after the release, on what is under it then:
      // the dimmed page behind the sheet.
      act(() => vi.advanceTimersByTime(20))
      const dimmed = queryByRole(
        'dialog',
        'Debounce lookups',
      )?.previousElementSibling
      allowed(dimmed ?? document.body, new MouseEvent('click', fingerClick))

      expect({
        early,
        held,
        lifted,
        afterRelease: rowStatus(),
        sheet: queryByRole('dialog', 'Debounce lookups') !== null,
        menu: menuItems('Debounce lookups'),
      }).toEqual({
        early: '',
        held: 'Moving Debounce lookups to place 2 of 2',
        lifted: true,
        afterRelease: '',
        sheet: true,
        menu: [
          { name: 'Rename session', off: false },
          { name: 'Move left', off: false },
          { name: 'Move right', off: true },
        ],
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
