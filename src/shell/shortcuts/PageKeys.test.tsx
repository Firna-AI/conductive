// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { Store } from '../../app/store'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import { queryByLabel, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import type { MacWindowState } from '../mac/mac-app'
import { placeOf, serverWith } from '../new-workspace/dialog-test-kit'
import { openPaletteTab } from '../palette/palette-test-kit'
import { press, settle } from '../test-mount'
import { pressHintKey } from './shortcut-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

describe('the keys of the commands of a page', () => {
  test('a command that the palette lists runs from its key as its row does, also on the Account page', async () => {
    holdAnimationFrames()
    const { app, navigation } = await openPaletteTab(routes.account(), {
      server: serverWith('dialog'),
    })
    // The Account page works on Acme, the first org, as the palette does.
    pressHintKey(app, 'new-workspace', document.body)
    await settle()
    const dialog = queryByRole('dialog', 'New workspace')
    const opened = {
      place: dialog === null ? null : placeOf(dialog),
      address: navigation.href(),
    }
    if (dialog) press(dialog, 'Escape')
    // The Keyboard shortcuts row of the Settings tab opens the tab.
    const shortcuts = pressHintKey(app, 'keyboard-shortcuts', document.body)
    await settle()
    expect({
      opened,
      shortcuts: {
        prevented: shortcuts.defaultPrevented,
        at: navigation.href(),
      },
    }).toEqual({
      opened: { place: 'Acme · General', address: routes.account() },
      shortcuts: { prevented: true, at: routes.accountTab('shortcuts') },
    })
  })

  test('the rail opens the org at the place of each key, also the org that the palette works on', async () => {
    const { app, navigation } = await openPaletteTab(routes.account())
    const step = async (command: ShortcutCommandId) => {
      const key = pressHintKey(app, command, document.body)
      await settle()
      return { prevented: key.defaultPrevented, at: navigation.href() }
    }
    // The palette works on Acme here, so it has no Switch to row for Acme.
    const steps = { first: await step('org-1'), second: await step('org-2') }
    expect(steps).toEqual({
      first: { prevented: true, at: routes.org(org) },
      second: { prevented: true, at: routes.org('futex') },
    })
  })

  test('a key whose command the page does not offer does nothing and goes on to the browser', async () => {
    const { app, navigation } = await openPaletteTab(routes.org(org))
    // The list page has no right column, no open workspace, and no composer.
    const commands: ShortcutCommandId[] = [
      'toggle-right-column',
      'archive-workspace',
      'focus-message',
    ]
    const prevented = commands.map(
      (command) => pressHintKey(app, command, document.body).defaultPrevented,
    )
    await settle()
    expect({ prevented, address: navigation.href() }).toEqual({
      prevented: [false, false, false],
      address: routes.org(org),
    })
  })

  test('the right column toggle, Workspace list, and Account page run from their keys', async () => {
    holdAnimationFrames()
    const { app, view, navigation } = await openPaletteTab(
      routes.workspace(org, workspace),
    )
    pressHintKey(app, 'toggle-right-column', document.body)
    const column = queryByLabel('Files and tools', view) !== null
    pressHintKey(app, 'workspace-list', document.body)
    await settle()
    const list = navigation.href()
    pressHintKey(app, 'account-page', document.body)
    await settle()
    expect({ column, list, account: navigation.href() }).toEqual({
      column: false,
      list: routes.org(org),
      account: routes.account(),
    })
  })

  test('the keys of the workspace list open its rows, count only the rows that it shows, and wrap at its ends', async () => {
    holdAnimationFrames()
    // The open workspace needs input. It is the last row that the list
    // shows, because the list hides the rows of the collapsed Infra.
    const { app, navigation } = await openPaletteTab(
      routes.workspace(org, workspace),
      { server: new FakeApiServer({ workspaceState: 'input' }) },
    )
    const step = async (command: ShortcutCommandId) => {
      const key = pressHintKey(app, command, document.body)
      await settle()
      return { prevented: key.defaultPrevented, at: navigation.href() }
    }
    const steps = {
      next: await step('next-workspace'),
      previous: await step('previous-workspace'),
      fourth: await step('workspace-4'),
      needsInput: await step('next-needs-input'),
      eighth: await step('workspace-8'),
    }
    const at = (id: string) => ({
      prevented: true,
      at: routes.workspace(org, id),
    })
    expect(steps).toEqual({
      next: at('email-dark-mode'),
      previous: at(workspace),
      fourth: at('fix-cart-flake'),
      needsInput: at(workspace),
      eighth: { prevented: false, at: routes.workspace(org, workspace) },
    })
  })

  test('in the Mac app, the keys hide the sidebar, and go back while the window has a page to go back to', async () => {
    let backs = 0
    let forwards = 0
    const { app, view } = await openPaletteTab(routes.org(org), {
      mac: true,
      platform: 'mac',
      macWindow: {
        state: new Store<MacWindowState>({
          mode: 'window',
          canGoBack: true,
          canGoForward: false,
        }),
        back: () => (backs += 1),
        forward: () => (forwards += 1),
      },
    })
    const before = queryByLabel('Workspaces', view) !== null
    pressHintKey(app, 'toggle-sidebar', document.body)
    await settle()
    const back = pressHintKey(app, 'back', document.body)
    const forward = pressHintKey(app, 'forward', document.body)
    expect({
      sidebar: { before, after: queryByLabel('Workspaces', view) !== null },
      back: { prevented: back.defaultPrevented, runs: backs },
      forward: { prevented: forward.defaultPrevented, runs: forwards },
    }).toEqual({
      sidebar: { before: true, after: false },
      back: { prevented: true, runs: 1 },
      forward: { prevented: false, runs: 0 },
    })
  })
})
