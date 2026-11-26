// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { Store } from '../../app/store'
import { FakeApiServer } from '../../test-support/fake-api'
import { byRole } from '../../test-support/dom-queries'
import { settingsDialog, settingsGroup, settingsTab } from './settings-test-kit'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'

describe('Settings over the last page', () => {
  test.each([
    { host: 'the Mac app', mac: true },
    { host: 'a browser', mac: false },
  ])(
    'in $host, the avatar opens Account settings over the page of Futex, the org that the tab opened last, and Close goes back to it',
    async ({ mac }) => {
      const app = await startedApp(new FakeApiServer())
      const window: MacWindow = {
        state: new Store<MacWindowState>({
          mode: 'window',
          canGoBack: false,
          canGoForward: false,
        }),
        back: () => undefined,
        forward: () => undefined,
      }
      const navigation = memoryNavigation('/')
      const shell = (
        <NavigationContext.Provider value={navigation}>
          <Shell />
        </NavigationContext.Provider>
      )
      const view = mountScreen(
        app,
        mac ? <MacApp window={window}>{shell}</MacApp> : shell,
      )
      const railLink = (label: string) => {
        const link = view.querySelector<HTMLAnchorElement>(
          `nav[aria-label="Orgs"] a[aria-label="${label}"]`,
        )
        if (!link) throw new Error(`The org rail has no ${label} link.`)
        return link
      }
      const sidebars = () =>
        Array.from(
          view.querySelectorAll('aside[aria-label="Workspaces"]'),
          (sidebar) => sidebar.querySelector('h2')?.textContent,
        )
      await settle()
      click(railLink('Futex'))
      await settle()
      const futex = navigation.href()
      click(railLink('Account'))
      await settle()
      const open = {
        general: settingsTab('General') !== null,
        account: settingsGroup('Account').open,
        org: settingsGroup('Futex').rows,
        sidebars: sidebars(),
      }
      click(byRole('button', 'Close', settingsDialog() ?? document))
      await settle()
      expect({
        open,
        closed: settingsDialog() === null,
        address: navigation.href(),
        sidebars: sidebars(),
      }).toEqual({
        open: {
          general: true,
          account: ['General'],
          org: [
            'General',
            'Repositories',
            'Cloud computer',
            'Agents',
            'Secrets',
            'Members',
          ],
          sidebars: ['Futex'],
        },
        closed: true,
        address: futex,
        sidebars: ['Futex'],
      })
    },
  )
})
