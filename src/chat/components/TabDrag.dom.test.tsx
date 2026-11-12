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
import { RowLayout, widthsByText } from './row-layout-test-kit'
import {
  debounce,
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
import { allowed, menuItems, tabList } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const mouse = { pointerType: 'mouse' }
const fingerClick = { bubbles: true, cancelable: true, detail: 1 }

/**
 * A mouse presses the tab at 150 px, the middle of the second place of a
 * row of 100 px tabs, lifts it, and holds the pointer at `x`.
 */
function dragTo(title: string, x: number) {
  pointer(byRole('button', title), 'pointerdown', { ...mouse, clientX: 150 })
  pointer(window, 'pointermove', { ...mouse, clientX: 160 })
  pointer(window, 'pointermove', { ...mouse, clientX: x })
}

/**
 * Runs `count` animation frames while the pointer holds still, and says
 * how far the row has scrolled and what its status says then.
 */
function holdFrames(count: number) {
  for (let frame = 0; frame < count; frame += 1) {
    act(() => {
      vi.advanceTimersToNextFrame()
    })
  }
  return { left: tabList().scrollLeft, status: rowStatus() }
}

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
    const fileTab = await waitFor(
      () => queryByText('app-[redacted].ts'),
      'the file tab',
    )
    layOut(
      byRole('button', 'Address autocomplete'),
      byRole('button', debounce),
      fileTab,
    )

    pointer(fileTab, 'pointerdown', { ...mouse, clientX: 250 })
    pointer(window, 'pointermove', { ...mouse, clientX: 240 })
    pointer(window, 'pointermove', { ...mouse, clientX: 120 })
    const moving = rowStatus()
    const lifted = liftedCopy('app-[redacted].ts')
    pointer(window, 'pointerup', { ...mouse, clientX: 120, buttons: 0 })
    act(() => byText('app-[redacted].ts').click())
    await settle()

    expect({
      moving,
      lifted,
      saved: await savedOrders(server),
      row: rowTitles(),
      visited: navigation.visited,
      shown: shownTab(),
    }).toEqual({
      moving: 'Moving app-[redacted].ts to place 2 of 3',
      lifted: true,
      saved: [[first, file, second]],
      row: ['Address autocomplete', 'app-[redacted].ts', debounce],
      visited: [],
      shown: 'Address autocomplete',
    })
  })

  it('keeps the order when Escape ends a drag, and the release after it shows nothing', async () => {
    const server = new FakeApiServer()
    await mountChat({ server, tabs: [first, second], viewport: 'desktop' })
    const tab = byRole('button', debounce)
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
      moving: `Moving ${debounce} to place 1 of 2`,
      afterEscape: '',
      saves: 0,
      row: ['Address autocomplete', debounce],
      shown: 'Address autocomplete',
    })
  })

  it('lifts a session tab on a phone after a finger holds it 450 ms, scrolls nothing while the finger holds still near the clipped end of a full row, and opens its tab menu as a sheet when the finger lets go without a move', async () => {
    // Two tabs of 150 px in a row of 200 px: the row clips the second tab.
    const rowLayout = new RowLayout(
      200,
      widthsByText({ 'Address autocomplete': 150, [debounce]: 150 }),
    )
    const server = new FakeApiServer()
    await mountChat({ server, tabs: [first, second], viewport: 'mobile' })
    rowLayout.settle()
    const tab = byRole('button', debounce)
    // 10 px from the clipped end: inside the zone where a drag scrolls the row.
    const finger = { pointerType: 'touch', pointerId: 2, clientX: 190 }

    vi.useFakeTimers()
    try {
      pointer(tab, 'pointerdown', finger)
      act(() => vi.advanceTimersByTime(449))
      const early = rowStatus()
      act(() => vi.advanceTimersByTime(1))
      const held = rowStatus()
      const lifted = liftedCopy(debounce)
      // A finger that stays within 8 px of its press has not moved. The
      // frames of 300 ms run while it holds still.
      pointer(window, 'pointermove', { ...finger, clientX: 196 })
      act(() => vi.advanceTimersByTime(300))
      const scrolled = tabList().scrollLeft
      pointer(window, 'pointerup', { ...finger, clientX: 196, buttons: 0 })
      // A finger sends its click after the release, on what is under it then:
      // the dimmed page behind the sheet.
      act(() => vi.advanceTimersByTime(20))
      const dimmed = queryByRole('dialog', debounce)?.previousElementSibling
      allowed(dimmed ?? document.body, new MouseEvent('click', fingerClick))

      expect({
        early,
        held,
        lifted,
        scrolled,
        afterRelease: rowStatus(),
        sheet: queryByRole('dialog', debounce) !== null,
        menu: menuItems(debounce),
      }).toEqual({
        early: '',
        held: `Moving ${debounce} to place 2 of 2`,
        lifted: true,
        scrolled: 0,
        afterRelease: '',
        sheet: true,
        menu: [
          { name: 'Rename session', off: false },
          { name: 'Copy link', off: false },
          { name: 'Copy concise transcript', off: false },
          { name: 'Copy full transcript', off: false },
          { name: 'Move left', off: false },
          { name: 'Move right', off: true },
        ],
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('scrolls a full row while the pointer of a drag stays near either end, drops the tab at a place that the scroll showed, and scrolls the next drag by the same step', async () => {
    // Three tabs of 100 px in a row of 200 px: it scrolls up to 100 px.
    const rowLayout = new RowLayout(
      200,
      widthsByText({
        'Address autocomplete': 100,
        [debounce]: 100,
        'app-[redacted].ts': 100,
      }),
    )
    const server = new FakeApiServer()
    await mountChat({
      server,
      tabs: [first, second, file],
      viewport: 'desktop',
      renderTab: fileTabs(testNavigation()),
    })
    await waitFor(() => queryByText('app-[redacted].ts'), 'the file tab')
    rowLayout.settle()

    // The frames of the page run only when the test steps them.
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    })
    try {
      // 5 px from an end, the pointer is 27 px into the 32 px zone of the
      // edge scroll: the row scrolls 11 of the 12 px of a full step a frame.
      dragTo(debounce, 195)
      const firstFrame = holdFrames(1)
      const rightEnd = holdFrames(11)
      pointer(window, 'pointermove', { ...mouse, clientX: 5 })
      const leftEnd = holdFrames(12)
      pointer(window, 'pointerup', { ...mouse, clientX: 5, buttons: 0 })
      await settle()
      const saved = await savedOrders(server)
      // A frame loop that the first drag left running doubles this step.
      dragTo('Address autocomplete', 195)
      const nextDrag = holdFrames(1)
      pointer(window, 'pointerup', { ...mouse, clientX: 195, buttons: 0 })

      expect({ firstFrame, rightEnd, leftEnd, saved, nextDrag }).toEqual({
        firstFrame: {
          left: 11,
          status: `Moving ${debounce} to place 2 of 3`,
        },
        rightEnd: {
          left: 100,
          status: `Moving ${debounce} to place 3 of 3`,
        },
        leftEnd: {
          left: 0,
          status: `Moving ${debounce} to place 1 of 3`,
        },
        saved: [[second, first, file]],
        nextDrag: {
          left: 11,
          status: 'Moving Address autocomplete to place 2 of 3',
        },
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
