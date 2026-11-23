// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { repositoryFailure } from '../../../ui/components/workspace/repositoryMoveCopy'
import {
  byLabel,
  byRole,
  byToast,
  queryByRole,
  shownToasts,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveMaskedHead } from '../../../test-support/fake-branch-names'
import {
  changedReply,
  movedWorkspace,
  repositoryChangedEvents,
  serveHeld,
  serveRepositoryChange,
  type FakeRepositoryEnd,
} from '../../../test-support/fake-repository-change'
import { fakeUser } from '../../../test-support/fixtures/core'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../../test-support/mount'
import { settle } from '../../test-mount'
import { emit, lastEvent } from '../kept-test-kit'
import { changeBodies, menuRow, openWorkspace } from './repository-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const current = 'Repository: acme/storefront'
const title = 'Change repository?'
const left =
  'This work stays with acme/storefront, and the workspace stops following it:'
const carried = 'This work in acme/billing-service moves to the new branch:'

/** The text of each row of a list of the question. */
function rows(dialog: HTMLElement, label: string): string[] {
  return Array.from(
    byLabel(label, dialog).children,
    (item) => item.textContent ?? '',
  )
}

/** Opens the menu and picks acme/billing-service. */
async function pick(tab: Awaited<ReturnType<typeof openWorkspace>>) {
  await press(await tab.button(current))
  await press(menuRow('acme/billing-service'))
}

describe('the question and the failure of a repository change', () => {
  test('the question lists the work that stays and the work that moves, Cancel sends nothing, and Change repository asks again with the work allowed', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveHeld(server, ['storefront', 'billing-service'])
    serveRepositoryChange(server, 'question')
    const tab = await openWorkspace(server)

    await pick(tab)
    await tab.poll()
    const dialog = byRole('dialog', title)
    const lists = {
      text: dialog.textContent?.startsWith(
        `${title}The workspace moves to a new branch of acme/billing-service. Nothing is deleted.`,
      ),
      left: rows(dialog, left),
      carried: rows(dialog, carried),
    }
    await press(byRole('button', 'Cancel', dialog))
    const cancelled = queryByRole('dialog', title)
    const afterCancel = (await changeBodies(server)).length
    await pick(tab)
    await tab.poll()
    const { detail, sessions } = workspaceFixtures()
    const events = repositoryChangedEvents(
      detail.workspace,
      [...sessions.sessions, ...sessions.history],
      senderSnapshot(fakeUser),
    )
    changedReply(
      server,
      movedWorkspace(detail.workspace),
      lastEvent(server) + events.length,
    )
    await press(byRole('button', 'Change repository', byRole('dialog', title)))
    await tab.poll()
    for (const event of events) emit(server, event)
    await settle()

    expect({
      lists,
      cancelled,
      afterCancel,
      allowWork: (await changeBodies(server)).map(
        (body) => (body as { allowWork?: boolean }).allowWork,
      ),
      header: (await tab.button('Repository: acme/billing-service'))
        .textContent,
      open: queryByRole('dialog', title),
    }).toEqual({
      lists: {
        text: true,
        left: [
          'src/app/checkout/AddressForm.tsxnot committed',
          'tests/checkout/address.test.tsnot committed',
          '1 commitnot pushed',
          'Pull request #482open',
          '3 commits of the branchon GitHub',
        ],
        carried: ['src/invoices/refunds.tsnot committed'],
      },
      cancelled: null,
      afterCancel: 1,
      allowWork: [undefined, undefined, true],
      header: 'acme/billing-service',
      open: null,
    })
  })

  test('the question names each changed file of both lists by its label, with a row for each real path, also when two paths share one label, and Change repository asks again with the real branch', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveHeld(server, ['storefront', 'billing-service'])
    await serveMaskedHead(server)
    serveRepositoryChange(server, 'question', 'masked-repository')
    const tab = await openWorkspace(server)

    await pick(tab)
    await tab.poll()
    const dialog = byRole('dialog', title)
    const text = dialog.textContent ?? ''
    const shown = {
      left: rows(dialog, left),
      carried: rows(dialog, carried),
      secret: text.includes('acme-7f3k') || text.includes('beta-2m9q'),
    }
    await press(byRole('button', 'Change repository', dialog))
    await tab.poll()

    const start = {
      expectedRepositoryId: 'storefront',
      expectedBranch: 'calummoore/checkout-acme-7f3k',
      repositoryId: 'billing-service',
    }
    expect({ ...shown, starts: await changeBodies(server) }).toEqual({
      left: [
        'src/app/checkout/AddressForm.tsxnot committed',
        'tests/checkout/address.test.tsnot committed',
        'scripts/seed-[redacted].sqlnot committed',
        'scripts/seed-[redacted].sqlnot committed',
        '1 commitnot pushed',
        'Pull request #482open',
        '3 commits of the branchon GitHub',
      ],
      carried: [
        'src/invoices/refunds.tsnot committed',
        'src/invoices/refunds-[redacted].tsnot committed',
        'src/invoices/refunds-[redacted].tsnot committed',
      ],
      secret: false,
      starts: [start, { ...start, allowWork: true }],
    })
  })

  test.each([
    [
      'a clash in the new folder',
      'clash',
      repositoryFailure.clash('acme/billing-service'),
    ],
    [
      'an agent runner that cannot move yet',
      'outdated',
      'Restart the software, then try again.',
    ],
  ] as const)(
    'after %s, the workspace keeps its repository and a toast names the reason',
    async (_, end: FakeRepositoryEnd, message) => {
      holdAnimationFrames()
      const server = new FakeApiServer()
      serveHeld(server, ['storefront', 'billing-service'])
      serveRepositoryChange(server, end)
      const tab = await openWorkspace(server)

      await pick(tab)
      await tab.poll()
      const toast = await waitFor(
        () =>
          shownToasts().length > 0 ? byToast(repositoryFailure.title) : null,
        'the toast of the failed change',
      )

      expect({
        toast: toast.textContent?.includes(message),
        toasts: shownToasts().length,
        header: (await tab.button(current)).textContent,
      }).toEqual({ toast: true, toasts: 1, header: 'acme/storefront' })
    },
  )
})
