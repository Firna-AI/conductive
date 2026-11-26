// @vitest-environment happy-dom

import { expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { githubPaths } from '../../../shared/github'
import { mergeQueuePaths } from '../../../shared/merge-queue'
import { byRole, queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { serveWork } from '../../../test-support/fake-bar'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  FAKE_GITHUB_HEAD_SHA,
  toolFixtures,
} from '../../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { openTab } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const direct = githubPaths.merge(org, workspace)
const queued = mergeQueuePaths.merge(org, workspace)
const stackLabel = 'Merge stack (3)'

async function stackBar(queue: 'same-org' | 'other-org' | null) {
  holdAnimationFrames()
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  serveWork(server, 'none')
  server.json('GET', githubPaths.banner(org, workspace), {
    ...toolFixtures('ready-to-merge').banner,
    mergeStack: { count: 3, queue },
  })
  server.json('POST', direct, { state: 'merged' })
  server.response('POST', queued, new Response(null, { status: 202 }))
  const { view } = await openTab(server, routes.workspace(org, workspace))
  return { view, server }
}

test.each([
  {
    queue: null,
    path: direct,
    body: { headSha: FAKE_GITHUB_HEAD_SHA, method: 'squash', stackCount: 3 },
  },
  {
    queue: 'same-org',
    path: queued,
    body: { pullNumber: 482, headSha: FAKE_GITHUB_HEAD_SHA, stackCount: 3 },
  },
] as const)(
  'sends Merge stack to the correct route for queue $queue',
  async ({ queue, path, body }) => {
    const { view, server } = await stackBar(queue)
    expect(queryByRole('button', 'Squash and merge', view)).toBeNull()
    click(byRole('button', stackLabel, view))
    await settle()
    expect(await bodiesOf(server, 'POST', path, 0)).toEqual([body])
    expect(
      await bodiesOf(server, 'POST', path === direct ? queued : direct, 0),
    ).toEqual([])
  },
)

test('names the other org queue and offers no Merge stack action', async () => {
  const { view } = await stackBar('other-org')
  expect(view.textContent).toContain(
    "Another org's merge queue holds a pull request below this one.",
  )
  expect(queryByRole('button', stackLabel, view)).toBeNull()
  expect(queryByRole('button', 'Squash and merge', view)).toBeNull()
})
