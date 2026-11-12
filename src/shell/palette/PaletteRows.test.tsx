// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import paletteStyles from '../../../docs/mockups/src/components/palette/CommandPalette.module.css'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { workspacePaths } from '../../shared/workspaces'
import { accessibleName, byLabel, byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click, press, settle, typeText } from '../test-mount'
import {
  groupLabels,
  highlighted,
  openPaletteTab,
  options,
  palette,
  searchField,
  status,
} from './palette-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/** The workspaces that the options open, as their IDs. */
function openedWorkspaces(): string[] {
  const prefix = `${routes.org(org)}/workspaces/`
  return options().map((option) =>
    (option.getAttribute('href') ?? '').replace(prefix, ''),
  )
}

/** The names of the options, as a screen reader reads them. */
function optionNames(): string[] {
  return options().map(accessibleName)
}

/** The first two texts of each option, in the order that the row shows them. */
function rowStarts(): string[][] {
  return options().map((option) =>
    Array.from(option.children, (part) => part.textContent ?? '')
      .filter((text) => text !== '')
      .slice(0, 2),
  )
}

// The app hides Desktop, so the palette offers no Go to Desktop.
const goTo = ['All files', 'Changes', 'Checks', 'Terminal', 'Preview'].map(
  (tab) => `Go to ${tab}`,
)

const otherOrgs = ['Create org', 'Switch to Futex', 'Switch to Firna']

/** Chooses an item of a filter menu of the open palette. */
function chooseFilter(button: string, item: string) {
  click(byRole('button', button, byRole('dialog', 'Search')))
  click(byRole('menuitemradio', item))
}

describe('the rows of the command palette', () => {
  test('the arrows move the highlight with a wrap at each end, and Enter closes the palette and opens the workspace', async () => {
    holdAnimationFrames()
    const { navigation } = await openPaletteTab(routes.org(org))
    pressCommand('command-palette', 'other', document.body)
    const first = highlighted()?.getAttribute('href')
    press(searchField(), 'ArrowDown')
    const second = highlighted()?.getAttribute('href')
    press(searchField(), 'ArrowUp')
    press(searchField(), 'ArrowUp')
    const wrappedUp = highlighted() === options().at(-1)
    press(searchField(), 'ArrowDown')
    press(searchField(), 'Enter')
    await settle()
    expect({
      first,
      second,
      wrappedUp,
      open: palette() !== null,
      href: navigation.href(),
    }).toEqual({
      first: routes.workspace(org, 'email-dark-mode'),
      second: routes.workspace(org, 'invoice-fonts'),
      wrappedUp: true,
      open: false,
      href: routes.workspace(org, 'email-dark-mode'),
    })
  })

  test('a row closes the palette before it runs, so Archive and Restore act at once with no question, and the field of a new section takes the focus', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openPaletteTab(
      routes.workspace(org, workspace),
      { server },
    )
    const lifecycle = [
      workspacePaths.archive(org, workspace),
      workspacePaths.restore(org, workspace),
    ].map((path) => `POST ${path}`)
    const run = async (search: string) => {
      pressCommand('command-palette', 'other', document.body)
      typeText(searchField(), search)
      press(searchField(), 'Enter')
      await settle()
      return {
        open: palette() !== null,
        dialog: document.querySelector('[role="dialog"]') !== null,
        writes: requestLines(server).filter((line) => lifecycle.includes(line)),
      }
    }
    const archive = await run('archive')
    // Over the archived workspace, the palette offers Restore.
    const restore = await run('restore')
    act(() => navigation.push(routes.org(org)))
    await settle()
    pressCommand('command-palette', 'other', document.body)
    typeText(searchField(), 'new section')
    press(searchField(), 'Enter')
    await settle()
    const field = byLabel(
      'Name of the new section',
      byLabel('Workspaces', view),
    )
    expect({
      archive,
      restore,
      section: {
        open: palette() !== null,
        focus: field.contains(document.activeElement),
      },
    }).toEqual({
      archive: { open: false, dialog: false, writes: lifecycle.slice(0, 1) },
      restore: { open: false, dialog: false, writes: lifecycle },
      section: { open: false, focus: true },
    })
  })

  test('a search finds active and archived workspaces, also by number with the label before the name, each row says its GitHub state before its state, the tabs keep the query, the filters choose the repository and the state, and an empty tab says why', async () => {
    const server = new FakeApiServer({ workspaceState: 'archived' })
    await openPaletteTab(routes.org(org), { server })
    pressCommand('command-palette', 'other', document.body)
    typeText(searchField(), '39')
    const number = {
      groups: groupLabels(),
      starts: rowStarts(),
      strong: options().map((row) =>
        row.classList.contains(paletteStyles.strong),
      ),
    }
    typeText(searchField(), 'storefront')
    const search = {
      groups: groupLabels(),
      opens: openedWorkspaces(),
      starts: rowStarts(),
      names: optionNames(),
    }
    click(byRole('tab', 'Workspaces'))
    const kept = { text: searchField().value, groups: groupLabels() }
    typeText(searchField(), '')
    const sections = groupLabels()
    chooseFilter('All repositories', 'acme/billing-service')
    const billing = openedWorkspaces()
    chooseFilter('Active', 'Archived')
    const archivedBilling = status()
    chooseFilter('acme/billing-service', 'All repositories')
    const archived = { groups: groupLabels(), opens: openedWorkspaces() }
    // A pointer leaves the focus on the filter, which the Actions tab removes.
    const actionsTab = byRole('tab', 'Actions')
    act(() => actionsTab.click())
    const focusBack = document.activeElement === searchField()
    typeText(searchField(), 'refund')
    expect({
      number,
      search,
      kept,
      sections,
      focusBack,
      billing,
      archivedBilling,
      archived,
      noMatch: status(),
    }).toEqual({
      number: {
        groups: ['Workspaces', 'Archived'],
        starts: [
          ['W-397', 'Invoice PDF fonts'],
          ['W-399', 'Retry failed webhooks'],
          ['W-398', 'Apple Pay button'],
          ['W-396', 'Upgrade to Next.js 16'],
          ['W-391', 'Move retries to a queue'],
          ['W-395', 'Checkout address autocomplete'],
        ],
        // Only the unread workspace shows its name in bold.
        strong: [false, true, false, false, false, false],
      },
      search: {
        groups: ['Workspaces', 'Archived'],
        opens: ['fix-cart-flake', 'apple-pay', 'next-16', workspace],
        starts: [
          ['Fix flaky cart test', 'acme/storefront'],
          ['Apple Pay button', 'acme/storefront'],
          ['Upgrade to Next.js 16', 'acme/storefront'],
          ['Checkout address autocomplete', 'acme/storefront'],
        ],
        // The GitHub state comes before the state, and an archived
        // workspace says none, as its mark shows no colour.
        names: [
          'Fix flaky cart testacme/storefront3m, Checks running, Working',
          'Apple Pay buttonacme/storefront5m, Checks failed, Ready',
          'Upgrade to Next.js 16acme/storefront7m, Ready',
          'Checkout address autocompleteacme/storefrontnow, Archived',
        ],
      },
      kept: { text: 'storefront', groups: ['Checkout', 'Infra'] },
      sections: ['General', 'Checkout', 'Infra'],
      billing: ['invoice-fonts', 'webhook-retries', 'retry-queue'],
      archivedBilling: 'Archived workspaces of acme/billing-service show here',
      archived: { groups: ['Archived'], opens: [workspace] },
      focusBack: true,
      noMatch:
        'Nothing matches “refund”Try a workspace name, a branch, or a repository.',
    })
  })

  test.each([
    {
      who: 'a member gets no Archive for the workspace of another person',
      server: () => new FakeApiServer({ role: 'member' }),
      groups: ['Checkout address autocomplete', 'Acme', 'Orgs', 'Help'],
      rows: [
        'New session',
        'Session history',
        ...goTo,
        'New workspace',
        'New section',
        ...otherOrgs,
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
      groups: ['Checkout address autocomplete', 'Orgs', 'Help'],
      rows: ['Session history', ...goTo, ...otherOrgs, 'Send feedback'],
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

  test('the Account page works on the org that the tab opened last, and a change of the address closes the palette', async () => {
    const { navigation } = await openPaletteTab(routes.org('futex'))
    act(() => navigation.push(routes.account()))
    await settle()
    pressCommand('command-palette', 'other', document.body)
    click(byRole('tab', 'Settings'))
    const groups = groupLabels()
    act(() => navigation.push(routes.org(org)))
    await settle()
    expect({ groups, open: palette() !== null }).toEqual({
      groups: ['Futex settings', 'Account'],
      open: false,
    })
  })
})
