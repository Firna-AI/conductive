// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { barLabels } from '../../../ui/components/workspace/barCopy'
import { routes } from '../../../app/router'
import { requestLines } from '../../../app/test-kit'
import { githubPaths, type BannerState } from '../../../shared/github'
import { mergeQueuePaths } from '../../../shared/merge-queue'
import { workspacesPath } from '../../../shared/workspaces'
import { accessibleName, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveWork } from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { withMergeQueue } from '../../../test-support/fixtures/merge-queue'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import {
  openPaletteTab,
  options,
  searchField,
} from '../../palette/palette-test-kit'
import { pressCommand } from '../../shortcuts/shortcut-test-kit'
import { click, settle, typeText } from '../../test-mount'
import { socketsOf } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const queue = {
  place: 3,
  count: 3,
  belowPullNumber: 479,
  trunk: 'main',
  state: 'queued',
  wait: null,
}

/** A server whose list queues `units`, and whose bar of the workspace has `bar`. */
function queueServer(
  units: readonly (readonly string[])[],
  bar?: object,
  state: BannerState = 'checks-running',
) {
  const server = new FakeApiServer({ banner: state })
  serveWork(server, 'none')
  const listed = workspaceFixtures().workspaces
  const workspaces = withMergeQueue(listed.workspaces, units)
  server.json('GET', workspacesPath(org), { ...listed, workspaces })
  const { banner } = toolFixtures(state).banner
  server.json('GET', githubPaths.banner(org, id), { banner, ...bar })
  return server
}

async function opened(server: FakeApiServer) {
  holdAnimationFrames()
  const tab = await openPaletteTab(routes.workspace(org, id), {
    server,
    events: socketsOf(server).events,
  })
  await settle()
  return tab
}

/** The line of the queue under the bar. */
function queueLine(view: HTMLElement): HTMLElement {
  const line = [...view.querySelectorAll<HTMLElement>('[role="status"]')].find(
    (item) => item.textContent?.startsWith('Place '),
  )
  if (!line) throw new Error('The bar has no line of the queue.')
  return line
}

const writes = (server: FakeApiServer, from: number) =>
  requestLines(server)
    .slice(from)
    .filter((line) => line.includes('/merge-queue'))

describe('the merge queue in the pull request bar', () => {
  test('sends the displayed ahead count to the queue and shows the running merge', async () => {
    const server = queueServer(
      [['next-16'], ['apple-pay'], [id]],
      { queue: { ...queue, mergeAhead: 2 } },
      'ready-to-merge',
    )
    const received: unknown[] = []
    server.handle('POST', mergeQueuePaths.merge(org, id), async (request) => {
      received.push(await request.json())
      server.json('GET', githubPaths.banner(org, id), {
        ...toolFixtures('ready-to-merge').banner,
        queue: { ...queue, state: 'merging' },
      })
      return new Response(null, { status: 202 })
    })
    const { view } = await opened(server)
    const from = requestLines(server).length
    const merge = byRole('button', 'Merge with 2 ahead', view)
    expect(merge.closest('[title]')?.getAttribute('title')).toContain(
      'Squash and merge',
    )
    click(merge)
    await settle()
    expect(received).toEqual([{ ahead: 2 }])
    expect(writes(server, from)).toEqual([
      `POST ${mergeQueuePaths.merge(org, id)}`,
    ])
    expect(requestLines(server).slice(from)).not.toContain(
      `POST ${githubPaths.merge(org, id)}`,
    )
    expect(
      byRole('button', barLabels.merging, view).getAttribute('aria-busy'),
    ).toBe('true')
    expect(queueLine(view).textContent).toBe(
      'Place 3 of 3 in the merge queue. Merging into main.',
    )
  })

  test('names the remaining GitHub base after the queue fails to reset it', async () => {
    const server = queueServer([], {
      queueLeave: { baseBranch: 'feature/lower' },
    })
    const { view } = await opened(server)
    expect(view.textContent).toContain(
      "The queue couldn't reset the base. This pull request still targets feature/lower.",
    )
  })

  test('a queued workspace shows its place and the pull request that it builds on, and Remove from queue asks first', async () => {
    const server = queueServer([['next-16'], ['apple-pay'], [id]], { queue })
    server.empty('DELETE', mergeQueuePaths.entry(org, id))
    const { view } = await opened(server)
    const line = queueLine(view)
    const text = line.textContent
    const from = requestLines(server).length
    click(byRole('button', 'Remove from queue', line))
    const dialog = byRole('dialog', 'Remove from the merge queue?')
    const question = dialog.textContent
    click(byRole('button', 'Remove', dialog))
    await settle()
    expect({ text, question, writes: writes(server, from) }).toEqual({
      text: 'Place 3 of 3 in the merge queue. It builds on #479.Remove from queue',
      question: expect.stringContaining(
        'Pull request #482 loses its place and targets main.',
      ),
      writes: [`DELETE ${mergeQueuePaths.entry(org, id)}`],
    })
  })

  test('a pull request that can join shows Add to merge queue beside its state, and the palette offers it', async () => {
    const server = queueServer([['next-16']])
    server.empty('POST', mergeQueuePaths.entry(org, id))
    const { view } = await opened(server)
    const from = requestLines(server).length
    click(byRole('button', 'Add to merge queue', view))
    await settle()
    const added = writes(server, from)
    // The list of the fake server still holds no entry, so Add stays.
    pressCommand('command-palette', 'other', document.body)
    typeText(searchField(), 'merge queue')
    await settle()
    const rows = options().map(accessibleName)
    expect({ added, rows }).toEqual({
      added: [`POST ${mergeQueuePaths.entry(org, id)}`],
      rows: expect.arrayContaining(['Add to merge queue']),
    })
  })
})
