// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  accessibleName,
  byLabel,
  byRole,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { click, press, settle, typeText } from '../test-mount'
import {
  groupLabels,
  highlighted,
  openPaletteTab,
  options,
  palette,
  pressPaletteKey,
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
    pressPaletteKey('other', document.body)
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

  test('a row closes the palette before it runs, so the Archive question shows alone and the field of a new section takes the focus', async () => {
    holdAnimationFrames()
    const { view, navigation } = await openPaletteTab(
      routes.workspace(org, workspace),
    )
    pressPaletteKey('other', document.body)
    typeText(searchField(), 'archive')
    press(searchField(), 'Enter')
    await settle()
    const question = queryByRole(
      'dialog',
      'Archive with work that is not pushed?',
    )
    const archive = {
      open: palette() !== null,
      question: question !== null,
      focus: question?.contains(document.activeElement) ?? false,
    }
    press(document.activeElement ?? document.body, 'Escape')
    act(() => navigation.push(routes.org(org)))
    await settle()
    pressPaletteKey('other', document.body)
    typeText(searchField(), 'new section')
    press(searchField(), 'Enter')
    await settle()
    const field = byLabel(
      'Name of the new section',
      byLabel('Workspaces', view),
    )
    expect({
      archive,
      section: {
        open: palette() !== null,
        focus: field.contains(document.activeElement),
      },
    }).toEqual({
      archive: { open: false, question: true, focus: true },
      section: { open: false, focus: true },
    })
  })

  test('a search finds active and archived workspaces, also by number with the label before the name, the tabs keep the query, the filters choose the repository and the state, and an empty tab says why', async () => {
    const server = new FakeApiServer({ workspaceState: 'archived' })
    await openPaletteTab(routes.org(org), { server })
    pressPaletteKey('other', document.body)
    typeText(searchField(), '39')
    const number = { groups: groupLabels(), starts: rowStarts() }
    typeText(searchField(), 'storefront')
    const search = {
      groups: groupLabels(),
      opens: openedWorkspaces(),
      starts: rowStarts(),
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
      groups: ['Checkout address autocomplete', 'Acme', 'Orgs'],
      rows: [
        'New session',
        'Session history',
        ...goTo,
        'New workspace',
        'New section',
        ...otherOrgs,
      ],
    },
    {
      who: 'a suspended org offers nothing that changes it',
      server: () => {
        const server = new FakeApiServer()
        serveSuspendedAcme(server)
        return server
      },
      groups: ['Checkout address autocomplete', 'Orgs'],
      rows: ['Session history', ...goTo, ...otherOrgs],
    },
  ])('on the Actions tab, $who', async ({ server, groups, rows }) => {
    holdAnimationFrames()
    await openPaletteTab(routes.workspace(org, workspace), {
      server: server(),
    })
    pressPaletteKey('other', document.body)
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
    pressPaletteKey('other', document.body)
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
