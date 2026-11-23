import { beforeAll, expect, it } from 'vitest'

import {
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { readQueue } from './data'
import { mergeFixture, PARALLEL_HEAD, TRUNK_HEAD } from './merge.test-support'
import { PARALLEL, queueBundle } from './queue.test-support'
import { restackFixture } from './restack.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('uses the last trunk-facing pull when the trunk is renamed during a re-order', async () => {
  const f = await mergeFixture(bundle, 'units')
  try {
    f.api.checks.set(HEAD_SHA, [{ ...passedRun, conclusion: 'FAILURE' }])
    await f.queue.advanceStartAlarm()
    expect(
      (
        await f.change('PUT', PARALLEL, {
          body: { beforeWorkspaceId: OUTER_WORKSPACE },
        })
      ).status,
    ).toBe(204)
    const reordered = await f.bar(OUTER_WORKSPACE)
    expect(await reordered.json()).toMatchObject({
      queue: {
        belowPullNumber: 4,
        rebase: { base: 'parallel', baseHead: PARALLEL_HEAD },
      },
    })
    f.api.defaultBranch = 'trunk'
    f.api.branches.delete('refs/heads/main')
    f.api.branches.set('refs/heads/trunk', TRUNK_HEAD)
    await f.db
      .prepare('UPDATE repositories SET default_branch = ? WHERE id = ?')
      .bind('trunk', OUTER_REPOSITORY)
      .run()
    expect(await (await f.bar(PARALLEL)).json()).toMatchObject({
      queue: { wait: 'trunk-change' },
    })
    f.api.pulls[2].baseRefName = 'trunk'
    await f.queue.advanceStartAlarm()
    expect(await readQueue(f.db, f.scope)).toMatchObject({ trunk: 'trunk' })
    expect((await f.entries()).map(({ pullNumber }) => pullNumber)).toEqual([
      4, 2,
    ])
    expect(f.writes()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('rebuilds a reordered stack before any merge and refuses a move ahead of a merging layer', async () => {
  const f = await restackFixture(bundle)
  try {
    const oldBottom = await f.session(OUTER_WORKSPACE)
    const newBottom = await f.session(PARALLEL)
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await f.queue.advanceStartAlarm()
    f.api.requests = []
    expect(
      (
        await f.change('PUT', PARALLEL, {
          body: { beforeWorkspaceId: OUTER_WORKSPACE },
        })
      ).status,
    ).toBe(204)
    await f.queue.advanceStartAlarm()
    expect(f.steps().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/stacks/1/unstack',
    ])
    expect(
      (await f.messages(PARALLEL, newBottom)).map(({ text }) => text),
    ).toEqual([
      expect.stringContaining(`git rebase --onto origin/main ${HEAD_SHA}`),
    ])
    expect(await f.messages(OUTER_WORKSPACE, oldBottom)).toEqual([])

    const firstHead = 'c'.repeat(40)
    f.api.pulls[4].headRefOid = firstHead
    f.api.branches.set('refs/heads/parallel', firstHead)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${firstHead}`, TRUNK_HEAD)
    f.api.mergeBases.set(`${HEAD_SHA}...${firstHead}`, TRUNK_HEAD)
    await f.endFix(PARALLEL, newBottom)
    await f.queue.advanceStartAlarm()
    expect(f.writes()).toEqual([])
    expect((await f.click(PARALLEL, 0)).status).toBe(409)
    expect(
      (await f.messages(OUTER_WORKSPACE, oldBottom)).map(({ text }) => text),
    ).toEqual([
      expect.stringContaining(
        `git rebase --onto origin/parallel ${TRUNK_HEAD}`,
      ),
    ])
    const upperHead = 'd'.repeat(40)
    f.api.pulls[2].headRefOid = upperHead
    f.api.branches.set('refs/heads/changes', upperHead)
    f.api.mergeBases.set(`${firstHead}...${upperHead}`, firstHead)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${upperHead}`, TRUNK_HEAD)
    f.api.checks.set(upperHead, [{ ...passedRun, conclusion: 'FAILURE' }])
    await f.endFix(OUTER_WORKSPACE, oldBottom)
    await f.queue.advanceStartAlarm()
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: 2,
      reordering: 0,
    })
    expect(await f.steps().at(-1)?.clone().json()).toEqual({
      pull_requests: [4, 2],
    })
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/4/merge-async',
    ])
    const refused = await f.change('PUT', OUTER_WORKSPACE, {
      body: { beforeWorkspaceId: PARALLEL },
    })
    expect(refused.status).toBe(409)
    expect(await refused.json()).toHaveProperty(
      'error.code',
      'merge_queue_merging',
    )
  } finally {
    await f.dispose()
  }
})
