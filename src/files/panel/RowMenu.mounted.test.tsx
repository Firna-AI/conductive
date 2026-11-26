// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  allowed,
  focused,
  menuItems,
  pressOn,
  rightClick,
} from '../../chat/components/tab-row-test-kit'
import { filePaths } from '../../shared/files'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../test-support/fixtures/tools'
import { MOUNTED_TEST_TIMEOUT, press, pressKey } from '../../test-support/mount'
import changeStyles from './ChangeList.module.css'
import treeStyles from './FileTree.module.css'
import {
  mountPanel,
  placeBox,
  placeOf,
  pointer,
  recordedItems,
} from './row-menu-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

describe('the row menu of the Files panel', () => {
  it('opens on a right click of a file row at the pointer, marks the row, keeps the menu of the browser shut, closes on Escape with the focus back on the row, and gives its item the real path, the kind, and the change of the row', async () => {
    const { pressed, items } = recordedItems()
    const { link } = await mountPanel({ list: 'all', rowMenu: items })
    const row = link({ kind: 'file', path: FAKE_FILE_PATH, mode: 'preview' })
    const marked = () => row.classList.contains(treeStyles.menuOpen)

    const browserMenu = rightClick(row, { clientX: 120, clientY: 200 })
    const opened = {
      browserMenu,
      items: menuItems('AddressForm.tsx'),
      place: placeOf('AddressForm.tsx'),
      marked: marked(),
      focus: focused(),
    }
    await pressKey('Escape')
    const closed = {
      items: menuItems('AddressForm.tsx'),
      marked: marked(),
      focus: document.activeElement === row,
    }
    rightClick(row, { clientX: 120, clientY: 200 })
    await press(byRole('menuitem', 'Copy path'))

    expect({
      opened,
      closed,
      pressed,
      after: {
        items: menuItems('AddressForm.tsx'),
        focus: document.activeElement === row,
      },
    }).toEqual({
      opened: {
        browserMenu: false,
        items: [{ name: 'Copy path', off: false }],
        place: { left: '120px', top: '200px' },
        marked: true,
        focus: 'Copy path',
      },
      closed: { items: [], marked: false, focus: true },
      pressed: [{ path: FAKE_FILE_PATH, kind: 'file', change: 'modified' }],
      after: { items: [], focus: true },
    })
  })

  it('opens below a focused folder row on Shift and F10, closes on Tab with the focus back on the row, and gives its item the real path of the folder', async () => {
    const { pressed, items } = recordedItems()
    await mountPanel({ list: 'all', rowMenu: items })
    const folder = byRole('button', 'lib')
    placeBox(folder, new DOMRect(8, 100, 240, 28))
    act(() => folder.focus())

    const keyReachesBrowser = pressOn(folder, 'F10', { shiftKey: true })
    const opened = {
      keyReachesBrowser,
      items: menuItems('lib'),
      place: placeOf('lib'),
      focus: focused(),
    }
    await pressKey('Tab')
    const closed = { items: menuItems('lib'), focus: focused() }
    pressOn(folder, 'F10', { shiftKey: true })
    await press(byRole('menuitem', 'Copy path'))

    expect({ opened, closed, pressed }).toEqual({
      opened: {
        keyReachesBrowser: false,
        items: [{ name: 'Copy path', off: false }],
        place: { left: '8px', top: '132px' },
        focus: 'Copy path',
      },
      closed: { items: [], focus: 'lib' },
      pressed: [{ path: 'src/lib', kind: 'directory', change: null }],
    })
  })

  it('on a phone, opens a sheet with the name of a row of Changes after a long press of a finger that holds still, opens no diff with the click after it, and opens nothing for a mouse, a finger that moves, or a hold that Escape ends, which takes the key from the page', async () => {
    const server = new FakeApiServer()
    server.json('GET', filePaths.changes(org, workspace), {
      baseBranch: 'main',
      files: [
        {
          path: 'src/lib/geo.ts',
          previousPath: 'src/geo.ts',
          change: 'renamed',
          added: 1,
          removed: 1,
          uncommitted: true,
        },
        {
          path: 'src/lib/old.ts',
          change: 'deleted',
          added: 0,
          removed: 9,
          uncommitted: false,
        },
      ],
      summary: { files: 2, added: 1, removed: 10 },
    })
    const { pressed, items } = recordedItems()
    const { link, navigation } = await mountPanel({
      server,
      list: 'changes',
      layout: 'phone',
      rowMenu: items,
    })
    const moved = link({ kind: 'diff', path: 'src/lib/geo.ts' })
    const finger = { pointerType: 'touch', pointerId: 2, clientX: 40 }
    const fingerClick = { bubbles: true, cancelable: true, detail: 1 }
    const sheet = () => queryByRole('dialog', 'geo.ts') !== null

    vi.useFakeTimers()
    let early: { mouse: boolean; scroll: boolean }
    let cancelled: { taken: boolean; sheet: boolean }
    let hold: { browserMenu: boolean }
    let release: { sheet: boolean; click: boolean; marked: boolean }
    try {
      // A mouse that holds still binds nothing, so it can select text.
      pointer(moved, 'pointerdown', { pointerType: 'mouse', clientX: 40 })
      act(() => vi.advanceTimersByTime(450))
      pointer(window, 'pointerup', { pointerType: 'mouse', buttons: 0 })
      const mouse = sheet()
      // A finger that moves first scrolls the list.
      pointer(moved, 'pointerdown', finger)
      pointer(window, 'pointermove', { ...finger, clientY: 40 })
      act(() => vi.advanceTimersByTime(450))
      pointer(window, 'pointerup', { ...finger, clientY: 40, buttons: 0 })
      early = { mouse, scroll: sheet() }

      // Escape ends a held press, so its release opens nothing.
      pointer(moved, 'pointerdown', finger)
      act(() => vi.advanceTimersByTime(450))
      const escape = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      act(() => {
        moved.dispatchEvent(escape)
      })
      pointer(window, 'pointerup', { ...finger, buttons: 0 })
      cancelled = { taken: escape.defaultPrevented, sheet: sheet() }

      pointer(moved, 'pointerdown', finger)
      act(() => vi.advanceTimersByTime(450))
      // A browser of a phone sends its menu event while the finger holds.
      hold = { browserMenu: rightClick(moved) }
      pointer(window, 'pointerup', { ...finger, buttons: 0 })
      const click = allowed(moved, new MouseEvent('click', fingerClick))
      release = {
        sheet: sheet(),
        click,
        marked: moved.classList.contains(changeStyles.menuOpen),
      }
    } finally {
      vi.useRealTimers()
    }
    const opened = menuItems('geo.ts')
    await press(byRole('menuitem', 'Copy path'))
    const closed = { sheet: sheet(), focus: document.activeElement === moved }
    rightClick(link({ kind: 'diff', path: 'src/lib/old.ts' }))
    await press(byRole('menuitem', 'Copy path'))

    expect({
      early,
      cancelled,
      hold,
      release,
      opened,
      closed,
      pressed,
    }).toEqual({
      early: { mouse: false, scroll: false },
      cancelled: { taken: true, sheet: false },
      hold: { browserMenu: false },
      release: { sheet: true, click: false, marked: true },
      opened: [{ name: 'Copy path', off: false }],
      closed: { sheet: false, focus: true },
      pressed: [
        { path: 'src/lib/geo.ts', kind: 'file', change: 'renamed' },
        { path: 'src/lib/old.ts', kind: 'file', change: 'deleted' },
      ],
    })
    expect(navigation.visited).toEqual([])
  })

  it('opens no menu on a row whose label hides a secret value, also a folder that the tree lacks and names from such a label, so the browser shows its own, and asks no item for its real path', async () => {
    const server = new FakeApiServer()
    server.json('GET', filePaths.tree(org, workspace), {
      revision: 1,
      entries: [
        {
          path: 'keys-acme-7f3k/a.json',
          displayPath: 'keys-[redacted]/a.json',
          name: 'a.json',
          kind: 'file',
          change: 'added',
        },
        { path: 'notes.md', name: 'notes.md', kind: 'file', change: null },
      ],
    })
    server.json('GET', filePaths.changes(org, workspace), {
      baseBranch: 'main',
      files: [
        {
          path: 'keys-acme-7f3k/a.json',
          displayPath: 'keys-[redacted]/a.json',
          change: 'added',
          added: 3,
          removed: 0,
          uncommitted: true,
        },
      ],
      summary: { files: 1, added: 3, removed: 0 },
    })
    const { asked, items } = recordedItems()
    const { link, show } = await mountPanel({
      server,
      list: 'all',
      rowMenu: items,
    })
    const folder = byRole('button', 'keys-[redacted]')
    const masked = { kind: 'file', path: 'keys-acme-7f3k/a.json' } as const
    act(() => folder.focus())
    const hidden = {
      folder: rightClick(folder),
      folderKey: pressOn(folder, 'F10', { shiftKey: true }),
      file: rightClick(link({ ...masked, mode: 'preview' })),
      menus: document.querySelectorAll('[role="menu"]').length,
    }
    const plain = rightClick(
      link({ kind: 'file', path: 'notes.md', mode: 'preview' }),
    )
    await pressKey('Escape')
    await show('changes')
    const change = rightClick(link({ ...masked, kind: 'diff' }))

    expect({
      hidden,
      plain,
      change,
      menus: document.querySelectorAll('[role="menu"]').length,
      asked: [...asked],
    }).toEqual({
      hidden: { folder: true, folderKey: true, file: true, menus: 0 },
      plain: false,
      change: true,
      menus: 0,
      asked: ['notes.md'],
    })
  })
})
