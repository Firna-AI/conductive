// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { Store } from '../../app/store'
import { FakeApiServer } from '../../test-support/fake-api'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { MacApp, type MacWindow, type MacWindowState } from './mac-app'

describe('the Account sidebar', () => {
  test.each([
    {
      host: 'Mac',
      outcome: 'keeps the last opened org, Futex,',
      mac: true,
      expectedOrgs: ['Futex'],
    },
    {
      host: 'browser',
      outcome: 'has no Workspaces sidebar',
      mac: false,
      expectedOrgs: [],
    },
  ])(
    '$host Account $outcome within one run of the app',
    async ({ mac, expectedOrgs }) => {
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
      const view = mountScreen(
        app,
        mac ? (
          <MacApp window={window}>
            <Shell />
          </MacApp>
        ) : (
          <Shell />
        ),
      )
      const railLink = (label: string) => {
        const link = view.querySelector<HTMLAnchorElement>(
          `nav[aria-label="Orgs"] a[aria-label="${label}"]`,
        )
        if (!link) throw new Error(`The org rail has no ${label} link.`)
        return link
      }
      await settle()
      click(railLink('Futex'))
      await settle()
      click(railLink('Account'))
      await settle()

      expect(view.querySelector('main h1')?.textContent).toBe('Account')
      const sidebars = view.querySelectorAll('aside[aria-label="Workspaces"]')
      expect(
        Array.from(
          sidebars,
          (sidebar) => sidebar.querySelector('h2')?.textContent,
        ),
      ).toEqual(expectedOrgs)
    },
  )
})
