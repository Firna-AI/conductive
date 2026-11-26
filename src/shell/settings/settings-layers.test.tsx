// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle } from '../test-mount'
import { openShell } from './settings-shell-kit'
import { settingsDialog, settingsRow, settingsRows } from './settings-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

describe('Settings and the layers around it', () => {
  test('Escape ends a recording, then closes a role menu, before it closes Settings', async () => {
    const { navigation } = await openShell(routes.accountTab('shortcuts'))
    click(byRole('button', 'Change Control K for Command palette'))
    const recording = queryByRole('textbox', 'New shortcut for Command palette')
    press(recording ?? document.body, 'Escape')
    await settle()
    const recorded = {
      recording: recording !== null,
      ended:
        queryByRole('textbox', 'New shortcut for Command palette') === null,
      settings: settingsDialog() !== null,
    }
    navigation.push(routes.settings(org, 'members'))
    await settle()
    const role = byRole('button', 'Role of Priya Raman: Member')
    click(role)
    await settle()
    const opened = role.getAttribute('aria-expanded')
    press(role, 'Escape')
    await settle()
    expect({
      recorded,
      menu: {
        opened,
        closed: role.getAttribute('aria-expanded'),
        settings: settingsDialog() !== null,
        address: navigation.href(),
      },
    }).toEqual({
      recorded: { recording: true, ended: true, settings: true },
      menu: {
        opened: 'true',
        closed: 'false',
        settings: true,
        address: routes.settings(org, 'members'),
      },
    })
  })

  test('over Get started, an org tab keeps Get started below and the same dialog, its org stays for Account settings, and Close goes back to Get started', async () => {
    const { navigation } = await openShell(routes.getStarted())
    navigation.push(routes.account())
    await settle()
    const first = settingsDialog()
    click(settingsRow('Acme', 'Members'))
    await settle()
    const below = () => document.querySelector('main h1')?.textContent
    const inOrg = { same: settingsDialog() === first, below: below() }
    navigation.push(routes.settings('futex', 'members'))
    await settle()
    click(settingsRow('Account', 'Agents'))
    await settle()
    // The org of the last org tab stays for Account settings.
    const futex = settingsRows('Futex').size
    press(document.body, 'Escape')
    await settle()
    expect({ inOrg, futex, address: navigation.href() }).toEqual({
      inOrg: { same: true, below: 'Get started' },
      futex: 6,
      address: routes.getStarted(),
    })
  })
})
