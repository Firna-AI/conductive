// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { repositoryBranchesPath } from '../../shared/branches'
import { workspacesPath } from '../../shared/workspaces'
import type { FakeApiServer } from '../../test-support/fake-api'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { messageText } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import { away, bodiesOf, org } from '../workspace/kept-test-kit'
import {
  mainOf,
  messageIn,
  newWorkspaceRow,
  openDialog,
  openTab,
  serverWith,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const task = 'Let shoppers save their cart.'
const picked = 'calummoore/checkout-autocomplete'
const branchesPath = repositoryBranchesPath(org, 'storefront')
const createPath = workspacesPath(org)
const hour = 3_600_000
const stacks = 'The pull request holds only the new work.'

/** The branches of acme/storefront, as the Worker lists them. */
function serveBranches(server: FakeApiServer): void {
  server.json('GET', branchesPath, {
    defaultBranch: 'main',
    branches: [
      { name: 'main', committedAt: FAKE_TIME - 9 * hour },
      { name: 'priyaraman/checkout-tax-rates', committedAt: FAKE_TIME - hour },
      { name: picked, committedAt: FAKE_TIME - 2 * hour },
      { name: 'develop', committedAt: FAKE_TIME - 24 * hour },
    ],
  })
}

/** The rows of the open picker: the name and the detail, and a check mark. */
function rowsIn(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('[role="option"]'), (row) => {
    const parts = Array.from(row.children, (part) => part.textContent ?? '')
    const text = parts.filter((part) => part !== '').join(' ')
    return row.getAttribute('aria-selected') === 'true' ? `${text} ✓` : text
  })
}

/** The row of a branch in the open picker. */
function rowOf(root: HTMLElement, name: string): HTMLElement {
  const row = Array.from(
    root.querySelectorAll<HTMLElement>('[role="option"]'),
  ).find((item) => item.firstElementChild?.textContent === name)
  if (!row) throw new Error(`The picker has no row ${name}.`)
  return row
}

/** The name of the row that the search field highlights, or null. */
function highlighted(search: HTMLElement): string | null {
  const id = search.getAttribute('aria-activedescendant')
  if (!id) return null
  return document.getElementById(id)?.firstElementChild?.textContent ?? null
}

/** The number of reads of the branch list that the server got. */
const reads = (server: FakeApiServer) =>
  server.requests.filter(
    (request) => new URL(request.url).pathname === branchesPath,
  ).length

/** The text of the notice of a failed create, or null. */
const failure = (root: HTMLElement) =>
  root.querySelector('[role="alert"]')?.textContent ?? null

/** The client ID of the first message of a create request body. */
const messageIdOf = (body: unknown) =>
  (body as { firstMessage: { id: string } }).firstMessage.id

/** Picks a branch through the control, as a person does. */
async function pickBranch(root: HTMLElement, from: string, name: string) {
  click(byRole('button', `Branch: ${from}`, root))
  await settle()
  click(rowOf(root, name))
  await settle()
}

describe('the branch control of New workspace', () => {
  test('opens the branches of the repository, picks the first match of a search with Enter, offers the picked branch as the target first, and creates from it with the chosen target', async () => {
    const server = serverWith('page')
    serveBranches(server)
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    const main = mainOf(tab.view)
    typeText(messageIn(main), task)
    click(byRole('button', 'Branch: main', main))
    await settle()
    const search = byRole('combobox', 'Search branches', main)
    const opened = {
      focus: document.activeElement === search,
      rows: rowsIn(main),
      reads: reads(server),
    }
    typeText(search, ' CHECKOUT')
    const searched = { rows: rowsIn(main), highlighted: highlighted(search) }
    // Up from the first match wraps to the last, which Enter then picks.
    press(search, 'ArrowUp')
    const wrapped = highlighted(search)
    press(search, 'Enter')
    await settle()
    const control = byRole('button', `Branch: ${picked}`, main)
    const chosen = {
      picker: queryByRole('combobox', 'Search branches', main),
      focus: document.activeElement === control,
      first: byRole('radio', `Target ${picked}`, main).getAttribute(
        'aria-checked',
      ),
      line: queryByText(stacks, main) !== null,
    }
    click(byRole('radio', 'Target main', main))
    await settle()
    const changed = queryByText(
      `The pull request also holds the commits of the branch ${picked}.`,
      main,
    )
    click(byRole('button', 'Send', main))
    await settle()
    const [sent] = await bodiesOf(server, 'POST', createPath, 0)
    expect({
      opened,
      searched,
      wrapped,
      chosen,
      changed: changed !== null,
    }).toEqual({
      opened: {
        focus: true,
        rows: [
          'main default ✓',
          'priyaraman/checkout-tax-rates 1h',
          `${picked} 2h`,
          'develop 1d',
        ],
        reads: 1,
      },
      searched: {
        rows: ['priyaraman/checkout-tax-rates 1h', `${picked} 2h`],
        highlighted: 'priyaraman/checkout-tax-rates',
      },
      wrapped: picked,
      chosen: { picker: null, focus: true, first: 'true', line: true },
      changed: true,
    })
    expect(sent).toMatchObject({
      repositoryId: 'storefront',
      startBranch: picked,
      baseBranch: 'main',
      firstMessage: { text: task },
    })
  })

  test('shares the branch of the draft with the dialog, which shows the target line under its header, and a change of repository puts the control back on its default branch', async () => {
    const server = serverWith('dialog')
    serveBranches(server)
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    await pickBranch(mainOf(tab.view), 'main', picked)
    click(byRole('radio', 'Target main', mainOf(tab.view)))
    await tab.go(away)
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    const dialog = openDialog(tab.view)
    const shared = {
      control: queryByRole('button', `Branch: ${picked}`, dialog) !== null,
      target: byRole('radio', 'Target main', dialog).getAttribute(
        'aria-checked',
      ),
    }
    click(byRole('button', 'Repository: acme/storefront', dialog))
    const menu = byRole('menu', 'Repository', dialog)
    click(byRole('menuitemradio', 'acme/billing-service', menu))
    await settle()
    expect({
      shared,
      control: queryByRole('button', 'Branch: main', dialog) !== null,
      target: queryByRole('radio', 'Target main', dialog),
    }).toEqual({
      shared: { control: true, target: 'true' },
      control: true,
      target: null,
    })
  })

  test('opens as a sheet on a phone, where a failed read offers Try again that loads the list, and a pick selects the picked branch as the target first', async () => {
    const server = serverWith('page')
    server.json(
      'GET',
      branchesPath,
      { error: { code: 'github_unavailable', message: 'GitHub is down.' } },
      502,
    )
    const tab = await openTab(server, {
      at: routes.newWorkspace(org),
      viewport: 'phone',
    })
    click(byRole('button', 'Branch: main', tab.view))
    await settle()
    const sheet = byRole('dialog', 'Branch', document.body)
    const failed = {
      rows: rowsIn(sheet),
      notice: queryByText("The branches didn't load", sheet) !== null,
    }
    serveBranches(server)
    click(byRole('button', 'Try again', sheet))
    await settle()
    const loaded = { rows: rowsIn(sheet).length, reads: reads(server) }
    click(rowOf(sheet, picked))
    await settle()
    const choice = byRole('radiogroup', 'Target', tab.view)
    expect({
      failed,
      loaded,
      sheet: queryByRole('dialog', 'Branch', document.body),
      targets: Array.from(choice.querySelectorAll('[role="radio"]'), (card) =>
        card.getAttribute('aria-checked'),
      ),
    }).toEqual({
      failed: { rows: ['main default ✓'], notice: true },
      loaded: { rows: 4, reads: 2 },
      sheet: null,
      targets: ['true', 'false'],
    })
  })
})

describe('a create that the branch check refused', () => {
  test('keeps the message with Start from main for a missing branch, which puts the control back on main, and gives Try again to a GitHub account without access', async () => {
    const server = serverWith('page')
    serveBranches(server)
    const refuse = (code: string, status: number) =>
      server.json(
        'POST',
        createPath,
        { error: { code, message: 'The Worker refused.' } },
        status,
      )
    refuse('branch_not_found', 404)
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    const main = mainOf(tab.view)
    typeText(messageIn(main), task)
    await pickBranch(main, 'main', picked)
    click(byRole('button', 'Send', main))
    await settle()
    const missing = failure(main)
    click(byRole('button', 'Start from main', main))
    await settle()
    const started = {
      notice: failure(main),
      control: queryByRole('button', 'Branch: main', main) !== null,
      message: messageText(messageIn(main)),
      focus: messageIn(main).contains(document.activeElement),
    }
    refuse('github_access_required', 403)
    await pickBranch(main, 'main', picked)
    click(byRole('button', 'Send', main))
    await settle()
    const noAccess = failure(main)
    click(byRole('button', 'Try again', main))
    await settle()
    const sent = await bodiesOf(server, 'POST', createPath, 0)
    expect({ missing, started, noAccess }).toEqual({
      missing: `The workspace wasn't createdThe branch ${picked} is no longer on GitHub. Your message is kept.Start from main`,
      started: { notice: null, control: true, message: task, focus: true },
      noAccess:
        "The workspace wasn't createdYour GitHub account can't read acme/storefront. Your message is kept.Try again",
    })
    // Each send of the kept message has the ID of the first send.
    const firstId = messageIdOf(sent[0])
    expect(
      sent.map((body) => [
        (body as { startBranch?: string }).startBranch,
        messageIdOf(body) === firstId,
      ]),
    ).toEqual([
      [picked, true],
      [picked, true],
      [picked, true],
    ])
  })
})
