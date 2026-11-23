// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { mergeQueuePaths } from '../../shared/merge-queue'
import { workspacesPath } from '../../shared/workspaces'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { withMergeQueue } from '../../test-support/fixtures/merge-queue'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { openPaletteTab } from '../palette/palette-test-kit'
import { click, settle } from '../test-mount'
import { itemsOf, menuItem, rowLink } from './row-menu-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** The org page with two entries of acme/storefront in its queue. */
async function opened(upperBase?: string) {
  const server = new FakeApiServer()
  const listed = workspaceFixtures().workspaces
  const workspaces = withMergeQueue(listed.workspaces, [
    ['next-16'],
    ['apple-pay', 'checkout-autocomplete'],
  ]).map((workspace) => {
    if (
      workspace.id !== 'checkout-autocomplete' ||
      !workspace.mergeQueue ||
      !upperBase
    )
      return workspace
    return {
      ...workspace,
      mergeQueue: {
        ...workspace.mergeQueue,
        removal: {
          base: { text: upperBase },
          above: [],
        },
      },
    }
  })
  server.json('GET', workspacesPath(org), { ...listed, workspaces })
  server.empty('POST', mergeQueuePaths.entry(org, 'webhook-retries'))
  server.empty('DELETE', mergeQueuePaths.entry(org, 'apple-pay'))
  const tab = await openPaletteTab(routes.org(org), { server })
  await settle()
  return { ...tab, server }
}

const writes = (server: FakeApiServer, from: number) =>
  requestLines(server)
    .slice(from)
    .filter((line) => line.includes('/merge-queue'))

describe('the merge queue in the menu of a row', () => {
  test('a queued row offers Remove from queue and no Move to section, a row that can join offers Add to merge queue, and another row offers neither', async () => {
    await opened()
    expect({
      queued: itemsOf('apple-pay', 'Apple Pay button'),
      joins: itemsOf('webhook-retries', 'Retry failed webhooks'),
      refused: itemsOf('invoice-fonts', 'Invoice PDF fonts'),
    }).toEqual({
      queued: [
        'Reassign to >',
        'Rename',
        'Copy link',
        'Remove from queue',
        'Archive',
      ],
      joins: [
        'Move to section >',
        'Reassign to >',
        'Rename',
        'Copy link',
        'Add to merge queue',
        'Archive',
      ],
      refused: [
        'Move to section >',
        'Reassign to >',
        'Rename',
        'Copy link',
        'Archive',
      ],
    })
  })

  test('Add to merge queue adds the workspace, and Remove from queue asks first', async () => {
    const { server } = await opened()
    const from = requestLines(server).length
    rightClick(rowLink('webhook-retries'), { clientX: 120, clientY: 300 })
    click(menuItem('Add to merge queue'))
    await settle()
    const added = writes(server, from)
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    click(menuItem('Remove from queue'))
    const dialog = byRole('dialog', 'Remove from the merge queue?')
    const question = dialog.textContent
    expect(question).toContain(
      'Pull request #479 loses its place and targets main',
    )
    const asked = writes(server, from).length
    click(byRole('button', 'Remove', dialog))
    await settle()
    expect({ added, question, asked, all: writes(server, from) }).toEqual({
      added: [`POST ${mergeQueuePaths.entry(org, 'webhook-retries')}`],
      question: expect.stringContaining(
        'Checkout address autocomplete (#482) builds on this pull request',
      ),
      asked: 1,
      all: [
        `POST ${mergeQueuePaths.entry(org, 'webhook-retries')}`,
        `DELETE ${mergeQueuePaths.entry(org, 'apple-pay')}`,
      ],
    })
  })

  test('names the masked member base in the question for its upper pull request', async () => {
    await opened('apple-pay-[redacted]')
    rightClick(rowLink('checkout-autocomplete'), { clientX: 120, clientY: 300 })
    click(menuItem('Remove from queue'))
    expect(
      byRole('dialog', 'Remove from the merge queue?').textContent,
    ).toContain(
      'Pull request #482 loses its place and targets apple-pay-[redacted]',
    )
  })
})
