// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { accessibleName, byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click } from '../test-mount'
import { groupLabels, openPaletteTab, options } from './palette-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/** The names of the options, as a screen reader reads them. */
function optionNames(): string[] {
  return options().map(accessibleName)
}

// The app hides Desktop, so the palette offers no Go to Desktop.
const goTo = ['All files', 'Changes', 'Checks', 'Terminal', 'Preview'].map(
  (tab) => `Go to ${tab}`,
)

const otherOrgs = ['Create org', 'Switch to Futex', 'Switch to Firna']

describe('the Actions tab of the command palette', () => {
  test.each([
    {
      who: 'a member gets no Archive for the workspace of another person',
      server: () => new FakeApiServer({ role: 'member' }),
      groups: [
        'Checkout address autocomplete',
        'Acme',
        'Orgs',
        'Window',
        'Help',
      ],
      rows: [
        'New session',
        'Session history',
        ...goTo,
        'New terminal',
        'Merge latest main',
        'New workspace',
        'New section',
        ...otherOrgs,
        'Hide the sidebar',
        'Send feedback',
      ],
    },
    {
      who: 'a suspended org offers nothing that changes it',
      server: () => {
        const server = new FakeApiServer()
        serveSuspendedAcme(server)
        return server
      },
      groups: ['Checkout address autocomplete', 'Orgs', 'Window', 'Help'],
      rows: [
        'Session history',
        ...goTo,
        ...otherOrgs,
        'Hide the sidebar',
        'Send feedback',
      ],
    },
  ])('on the Actions tab, $who', async ({ server, groups, rows }) => {
    holdAnimationFrames()
    await openPaletteTab(routes.workspace(org, workspace), {
      server: server(),
    })
    pressCommand('command-palette', 'other', document.body)
    click(byRole('tab', 'Actions'))
    expect({ groups: groupLabels(), rows: optionNames() }).toEqual({
      groups,
      rows,
    })
  })
})
