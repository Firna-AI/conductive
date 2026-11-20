// @vitest-environment happy-dom

import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { Store } from '../../app/store'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  MOUNTED_TEST_TIMEOUT,
  requestDialogClose,
} from '../../test-support/mount'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'
import { Shell } from '../Shell'
import { click, mountScreen, press, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { settingsDialog, settingsGroup, settingsRow } from './settings-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

const accountRows = [
  'General',
  'Agents',
  'Preferences',
  'Keyboard shortcuts',
  'Stats',
]
const orgRows = [
  'General',
  'Repositories',
  'Cloud computer',
  'Secrets',
  'Members',
]

/** The shell at `address`, as a desktop, a phone, or the Mac app. */
async function openShell(
  address: string,
  options: {
    viewport?: 'desktop' | 'phone'
    mac?: boolean
    server?: FakeApiServer
  } = {},
) {
  const app = await startedApp(options.server ?? new FakeApiServer())
  const navigation = memoryNavigation(address)
  const window: MacWindow = {
    state: new Store<MacWindowState>({
      mode: 'window',
      canGoBack: false,
      canGoForward: false,
    }),
    back: () => undefined,
    forward: () => undefined,
  }
  const shell: ReactElement = (
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>
  )
  const view = mountScreen(
    app,
    options.mac ? <MacApp window={window}>{shell}</MacApp> : shell,
    { viewport: options.viewport ?? 'desktop' },
  )
  await settle()
  return { app, view, navigation }
}

/** The names of the org sidebars of the page below. */
function sidebars(view: HTMLElement): (string | null | undefined)[] {
  return Array.from(
    view.querySelectorAll('aside[aria-label="Workspaces"]'),
    (sidebar) => sidebar.querySelector('h2')?.textContent,
  )
}

/** Presses the dim around the Settings dialog. */
function pressDim(): void {
  const dim = settingsDialog()?.previousElementSibling
  if (!dim) throw new Error('Settings has no dim.')
  dim.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
}

describe('Settings', () => {
  test('an org address opens its tab in the dialog over the workspace list of the org, with the Account group first, and Esc goes to the list', async () => {
    const { view, navigation } = await openShell(
      routes.settings(org, 'secrets'),
    )
    const open = {
      account: settingsGroup('Account'),
      org: settingsGroup('Acme'),
      title: settingsDialog()?.querySelector('h1')?.textContent,
      focused: document.activeElement?.textContent,
      below: sidebars(view),
    }
    press(document.body, 'Escape')
    await settle()
    expect({
      open,
      closed: settingsDialog() === null,
      address: navigation.href(),
    }).toEqual({
      open: {
        account: { rows: accountRows, open: [] },
        org: { rows: orgRows, open: ['Secrets'] },
        title: 'Secrets',
        focused: 'Secrets',
        below: ['Acme'],
      },
      closed: true,
      address: routes.org(org),
    })
  })

  test('a member who is not an admin gets the same tabs', async () => {
    const member = new FakeApiServer({ role: 'member' })
    await openShell(routes.settings(org), { server: member })
    expect(settingsGroup('Acme').rows).toEqual(orgRows)
  })

  test('only the Mac app lists This Mac, last in the Account group', async () => {
    await openShell(routes.account(), { mac: true })
    expect(settingsGroup('Account').rows).toEqual([...accountRows, 'This Mac'])
  })

  test('a row opens its tab in the same dialog, the dim closes it, and the address goes back to the page below', async () => {
    const workspace = routes.workspace(org, FAKE_IDS.workspace)
    const { view, navigation } = await openShell(workspace)
    navigation.push(routes.accountTab('agents'))
    await settle()
    const first = settingsDialog()
    click(settingsRow('Acme', 'Members'))
    await settle()
    const moved = {
      address: navigation.href(),
      same: settingsDialog() === first,
      open: settingsGroup('Acme').open,
      below: sidebars(view),
    }
    pressDim()
    await settle()
    expect({
      moved,
      closed: settingsDialog() === null,
      address: navigation.href(),
    }).toEqual({
      moved: {
        address: routes.settings(org, 'members'),
        same: true,
        open: ['Members'],
        below: ['Acme'],
      },
      closed: true,
      address: workspace,
    })
  })

  test('a press in a dialog of a tab leaves Settings open, and Esc closes that dialog first', async () => {
    await openShell(routes.settings(org))
    click(byRole('button', 'Delete org', settingsDialog() ?? document))
    await settle()
    const question = queryByRole('dialog', 'Delete Acme?')
    question?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await settle()
    const pressed = settingsDialog() !== null
    // A browser sends the key, then asks the native dialog to close.
    if (question instanceof HTMLDialogElement) {
      press(question, 'Escape')
      await requestDialogClose(question)
    }
    await settle()
    expect({
      question: question !== null,
      pressed,
      afterEscape: {
        question: queryByRole('dialog', 'Delete Acme?') !== null,
        settings: settingsDialog() !== null,
      },
    }).toEqual({
      question: true,
      pressed: true,
      afterEscape: { question: false, settings: true },
    })
  })

  test('an org tab from the page of another org lies over the list of its own org', async () => {
    const { view, navigation } = await openShell(routes.org('futex'))
    navigation.push(routes.settings(org, 'members'))
    await settle()
    expect({ below: sidebars(view), org: settingsGroup('Acme').open }).toEqual({
      below: ['Acme'],
      org: ['Members'],
    })
  })

  test('a phone lists the tabs at the list address, and each tab is a screen with Settings as the way back', async () => {
    const { navigation } = await openShell(routes.settingsList(), {
      viewport: 'phone',
    })
    const list = {
      dialog: settingsDialog() !== null,
      account: settingsGroup('Account').rows,
      org: settingsGroup('Acme').rows,
    }
    click(settingsRow('Account', 'Agents'))
    await settle()
    expect({
      list,
      address: navigation.href(),
      title: document.querySelector('main h1')?.textContent,
      back: byRole('button', 'Settings') !== null,
    }).toEqual({
      list: { dialog: false, account: accountRows, org: orgRows },
      address: routes.accountTab('agents'),
      title: 'Agents',
      back: true,
    })
  })
})
