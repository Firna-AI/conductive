// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import type { Platform } from '../../app/services'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import { socketsOf } from '../workspace/wiring-test-kit'
import {
  groupLabels,
  openPaletteTab,
  palette,
  pressPaletteKey,
  searchField,
} from './palette-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/** The tab of the open palette that shows. */
function selectedTab(): string | null {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
  const tab = tabs.find((item) => item.getAttribute('aria-selected') === 'true')
  return tab?.textContent ?? null
}

describe('the command palette', () => {
  test('Ctrl+K opens it on the All tab with an empty field, and Ctrl+K, Escape, and a press outside close it and give the focus back', async () => {
    const { view } = await openPaletteTab(routes.org(org))
    const search = byRole('button', 'Search', byLabel('Workspaces', view))
    const hint = search.querySelector('kbd')?.textContent
    search.focus()
    const opening = pressPaletteKey('other')
    const opened = {
      prevented: opening.defaultPrevented,
      focus: document.activeElement === searchField(),
      tab: selectedTab(),
      behind: search.closest('[inert]') !== null,
    }
    // A press on a part of the dialog without a control keeps the typing in the field.
    click(byRole('dialog', 'Search'))
    const pressInside = document.activeElement === searchField()
    typeText(searchField(), 'retry')
    click(byRole('tab', 'Workspaces'))
    const closing = pressPaletteKey('other', searchField())
    const afterKey = {
      open: palette() !== null,
      prevented: closing.defaultPrevented,
      focus: document.activeElement === search,
    }
    pressPaletteKey('other')
    const reopened = { tab: selectedTab(), text: searchField().value }
    press(searchField(), 'Escape')
    const afterEscape = {
      open: palette() !== null,
      focus: document.activeElement === search,
    }
    pressPaletteKey('other')
    act(() => {
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      )
    })
    const afterPress = {
      open: palette() !== null,
      focus: document.activeElement === search,
      behind: search.closest('[inert]') !== null,
    }
    expect({
      hint,
      opened,
      pressInside,
      afterKey,
      reopened,
      afterEscape,
      afterPress,
    }).toEqual({
      hint: 'Ctrl K',
      opened: { prevented: true, focus: true, tab: 'All', behind: true },
      pressInside: true,
      afterKey: { open: false, prevented: true, focus: true },
      reopened: { tab: 'All', text: '' },
      afterEscape: { open: false, focus: true },
      afterPress: { open: false, focus: true, behind: false },
    })
  })

  test.each([
    {
      platform: 'mac',
      outcome:
        '⌘K opens it also from the terminal, and Ctrl+K stays with the page',
      hint: '⌘K',
      expected: { otherKey: false, terminal: true },
    },
    {
      platform: 'other',
      outcome:
        'Ctrl+K in the terminal goes to the terminal, and ⌘K stays with the page',
      hint: 'Ctrl K',
      expected: { otherKey: false, terminal: false },
    },
  ] satisfies {
    platform: Platform
    outcome: string
    hint: string
    expected: object
  }[])('on $platform, $outcome', async ({ platform, hint, expected }) => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view } = await openPaletteTab(routes.workspace(org, workspace), {
      platform,
      server,
      events: socketsOf(server).events,
    })
    await settle()
    const search = byRole('button', 'Search', byLabel('Workspaces', view))
    press(
      document.body,
      'k',
      platform === 'mac' ? { ctrl: true } : { meta: true },
    )
    const otherKey = palette() !== null
    pressPaletteKey(platform, byLabel('Terminal input', view))
    expect({
      hint: search.querySelector('kbd')?.textContent,
      otherKey,
      terminal: palette() !== null,
    }).toEqual({ hint, ...expected })
  })

  test('the key closes an open menu and opens the palette, and does nothing while a dialog is open', async () => {
    holdAnimationFrames()
    const { view, navigation } = await openPaletteTab(routes.org(org))
    const sidebar = byLabel('Workspaces', view)
    click(byRole('button', 'More for General', sidebar))
    const menuBefore = queryByRole('menu', 'General') !== null
    pressPaletteKey('other')
    const withMenu = {
      menu: queryByRole('menu', 'General') !== null,
      open: palette() !== null,
    }
    press(searchField(), 'Escape')
    act(() => navigation.push(routes.workspace(org, workspace)))
    await settle()
    const row = byLabel('Workspaces', view)
      .querySelector(`a[href="${routes.workspace(org, workspace)}"]`)
      ?.closest('li')
    if (!row) throw new Error('The workspace has no list row.')
    click(byRole('button', 'Archive workspace', row))
    await settle()
    const question = 'Archive with work that is not pushed?'
    const key = pressPaletteKey('other')
    expect({
      menuBefore,
      withMenu,
      dialog: {
        open: palette() !== null,
        question: queryByRole('dialog', question) !== null,
        prevented: key.defaultPrevented,
      },
    }).toEqual({
      menuBefore: true,
      withMenu: { menu: false, open: true },
      dialog: { open: false, question: true, prevented: false },
    })
  })

  test('in the Mac app, the Window group hides the sidebar, then offers to show it again', async () => {
    const { view } = await openPaletteTab(routes.org(org), {
      mac: true,
      platform: 'mac',
    })
    const sidebar = () => queryByLabel('Workspaces', view)
    pressPaletteKey('mac', document.body)
    click(byRole('tab', 'Actions'))
    const before = { groups: groupLabels(), shown: sidebar() !== null }
    click(byRole('option', 'Hide the sidebar'))
    await settle()
    const hidden = { open: palette() !== null, shown: sidebar() !== null }
    pressPaletteKey('mac', document.body)
    click(byRole('tab', 'Actions'))
    expect({
      before,
      hidden,
      offered: queryByRole('option', 'Show the sidebar') !== null,
    }).toEqual({
      before: { groups: ['Acme', 'Orgs', 'Window'], shown: true },
      hidden: { open: false, shown: false },
      offered: true,
    })
  })

  test('a phone opens it as a page from the Search row of the list, without a key, and Cancel closes it', async () => {
    const { view } = await openPaletteTab(routes.org(org), {
      viewport: 'phone',
    })
    const search = byRole('button', 'Search', view)
    const row = {
      text: search.textContent,
      shortcut: search.getAttribute('aria-keyshortcuts'),
    }
    click(search)
    const opened = {
      open: palette() !== null,
      placeholder: searchField().placeholder,
      focus: document.activeElement === searchField(),
    }
    click(byRole('button', 'Cancel', byRole('dialog', 'Search')))
    expect({
      row,
      opened,
      closed: {
        open: palette() !== null,
        focus: document.activeElement === search,
      },
    }).toEqual({
      row: { text: 'Search', shortcut: null },
      opened: { open: true, placeholder: 'Search', focus: true },
      closed: { open: false, focus: true },
    })
  })
})
