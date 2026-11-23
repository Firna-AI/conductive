// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { workspacesPath } from '../../shared/workspaces'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { messageText } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import { bodiesOf, org } from '../workspace/kept-test-kit'
import {
  pickBranch,
  picked,
  reads,
  rowsIn,
  serveBranches,
  targetsIn,
  task,
} from './branch-test-kit'
import { mainOf, messageIn, openTab, serverWith } from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const createPath = workspacesPath(org)

/** The name of the row that the search field highlights, or null. */
function highlighted(search: HTMLElement): string | null {
  const id = search.getAttribute('aria-activedescendant')
  if (!id) return null
  return document.getElementById(id)?.firstElementChild?.textContent ?? null
}

/** The text of the notice of a failed create, or null. */
const failure = (root: HTMLElement) =>
  root.querySelector('[role="alert"]')?.textContent ?? null

/** The client ID of the first message of a create request body. */
const messageIdOf = (body: unknown) =>
  (body as { firstMessage: { id: string } }).firstMessage.id

describe('the branch control of New workspace', () => {
  test('opens the branches of the repository under Start from without a Target part on the default branch, picks the first match of a search with Enter, which closes the dropdown on the control of the picked branch, and creates from it with that branch as the target', async () => {
    const server = serverWith('page')
    serveBranches(server)
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    const main = mainOf(tab.view)
    typeText(messageIn(main), task)
    const closed = byRole('button', 'Branch: main', main).textContent
    click(byRole('button', 'Branch: main', main))
    await settle()
    const search = byRole('combobox', 'Search branches', main)
    const opened = {
      focus: document.activeElement === search,
      startFrom: queryByRole('group', 'Start from', main) !== null,
      rows: rowsIn(main),
      targets: targetsIn(main),
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
      dropdown: queryByRole('combobox', 'Search branches', main),
      focus: document.activeElement === control,
      text: control.textContent,
    }
    click(byRole('button', 'Send', main))
    await settle()
    const [sent] = await bodiesOf(server, 'POST', createPath, 0)
    expect({ closed, opened, searched, wrapped, chosen }).toEqual({
      closed: 'main',
      opened: {
        focus: true,
        startFrom: true,
        rows: [
          'main default ✓',
          'priyaraman/checkout-tax-rates 1h',
          `${picked} 2h`,
          'develop 1d',
        ],
        targets: null,
        reads: 1,
      },
      searched: {
        rows: ['priyaraman/checkout-tax-rates 1h', `${picked} 2h`],
        highlighted: 'priyaraman/checkout-tax-rates',
      },
      wrapped: picked,
      chosen: { dropdown: null, focus: true, text: picked },
    })
    expect(sent).toMatchObject({
      repositoryId: 'storefront',
      startBranch: picked,
      baseBranch: picked,
      firstMessage: { text: task },
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
