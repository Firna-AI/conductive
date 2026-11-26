// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { Store } from '../../app/store'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import type { MacWindowState } from '../mac/mac-app'
import { feedbackDialog, serveFeedback } from '../feedback/feedback-test-kit'
import { placeOf, serverWith } from '../new-workspace/dialog-test-kit'
import { openPaletteTab, searchField } from '../palette/palette-test-kit'
import { click, press, settle } from '../test-mount'
import { pressHintKey } from './shortcut-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/** An address that names no org, whose page works on the first org. */
const noOrgPage = '/not-a-page'

describe('the keys of the commands of a page', () => {
  test('a command that the palette lists runs from its key as its row does, also on a page without an org, and Settings then holds the keys', async () => {
    holdAnimationFrames()
    const server = serverWith('dialog')
    serveFeedback(server)
    const { app, navigation } = await openPaletteTab(noOrgPage, { server })
    // The page works on Acme, the first org, as the palette does.
    pressHintKey(app, 'new-workspace', document.body)
    await settle()
    const dialog = queryByRole('dialog', 'New workspace')
    const opened = {
      place: dialog === null ? null : placeOf(dialog),
      address: navigation.href(),
    }
    if (dialog) press(dialog, 'Escape')
    await settle()
    // The key of Send feedback opens the Feedback dialog over the page.
    const feedback = pressHintKey(app, 'send-feedback', document.body)
    await settle()
    const sent = {
      prevented: feedback.defaultPrevented,
      dialog: feedbackDialog() !== null,
    }
    const shown = feedbackDialog()
    if (shown) press(shown, 'Escape')
    await settle()
    // The Keyboard shortcuts row of the Settings tab opens the tab.
    const shortcuts = pressHintKey(app, 'keyboard-shortcuts', document.body)
    await settle()
    const inSettings = {
      prevented: shortcuts.defaultPrevented,
      at: navigation.href(),
    }
    // Settings holds the keys, so the key of an org runs nothing over it.
    const orgKey = pressHintKey(app, 'org-2', document.body)
    await settle()
    expect({
      opened,
      sent,
      inSettings,
      orgKey: { prevented: orgKey.defaultPrevented, at: navigation.href() },
    }).toEqual({
      opened: { place: 'General', address: noOrgPage },
      sent: { prevented: true, dialog: true },
      inSettings: { prevented: true, at: routes.accountTab('shortcuts') },
      orgKey: { prevented: false, at: routes.accountTab('shortcuts') },
    })
  })

  test('the rail opens the org at the place of each key, also the org that the palette works on', async () => {
    const { app, navigation } = await openPaletteTab(noOrgPage)
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

  test('the rail and its keys leave out a deleted org, and the Switch to row of an org in the palette shows the key of its place in the rail', async () => {
    const { app, navigation, view } = await openPaletteTab(noOrgPage)
    const acme = app.orgs.get().find((item) => item.id === org)
    if (!acme) throw new Error('The app has no Acme.')
    act(() => {
      app.putOrg({
        ...acme,
        deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 1 },
      })
    })
    await settle()
    const key = pressHintKey(app, 'org-1', document.body)
    await settle()
    expect({ prevented: key.defaultPrevented, at: navigation.href() }).toEqual({
      prevented: true,
      at: routes.org('futex'),
    })
    // The palette works on Futex, the org of the page. So its other org is
    // Firna, the second org of the rail, after the deleted Acme in the list.
    const tile = byRole('link', 'Firna', byLabel('Orgs', view))
    pressHintKey(app, 'command-palette', document.body)
    click(byRole('tab', 'Actions'))
    const row = byRole('option', 'Switch to Firna')
    const keys = {
      tile: tile.getAttribute('aria-keyshortcuts'),
      row: row.getAttribute('aria-keyshortcuts'),
    }
    press(searchField(), 'Escape')
    await settle()
    const second = pressHintKey(app, 'org-2', document.body)
    await settle()
    expect({
      keys,
      second: { prevented: second.defaultPrevented, at: navigation.href() },
    }).toEqual({
      keys: { tile: 'Alt+2', row: 'Alt+2' },
      second: { prevented: true, at: routes.org('firna') },
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

  test('the right column toggle, Workspace list, and Settings run from their keys', async () => {
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
