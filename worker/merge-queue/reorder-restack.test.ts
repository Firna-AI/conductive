import { beforeAll, expect, it } from 'vitest'

import {
  OTHER_WORKSPACE,
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { readQueue } from './data'
import {
  mergeFixture,
  PARALLEL_HEAD,
  TOP_HEAD,
  TRUNK_HEAD,
} from './merge.test-support'
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

it('merges the ready bottom after a re-order and refuses a move ahead of it', async () => {
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
      expect.stringContaining(`git rebase --onto ${TRUNK_HEAD} ${HEAD_SHA}`),
    ])
    expect(await f.messages(OUTER_WORKSPACE, oldBottom)).toEqual([])

    const firstHead = 'c'.repeat(40)
    f.api.pulls[4].headRefOid = firstHead
    f.api.branches.set('refs/heads/parallel', firstHead)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${firstHead}`, TRUNK_HEAD)
    f.api.mergeBases.set(`${HEAD_SHA}...${firstHead}`, TRUNK_HEAD)
    await f.endFix(PARALLEL, newBottom)
    await f.queue.advanceStartAlarm()
    expect(
      (await f.messages(OUTER_WORKSPACE, oldBottom)).map(({ text }) => text),
    ).toEqual([
      expect.stringContaining(`git rebase --onto ${firstHead} ${TRUNK_HEAD}`),
    ])
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: null,
      reordering: 1,
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

it.each(['automatically', 'on a click'])(
  'merges the rebuilt prefix %s while the third layer waits for a restack',
  async (mode) => {
    const f = await mergeFixture(bundle, 'units')
    try {
      f.api.pulls[3].baseRefName = 'main'
      expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
      expect(
        (
          await f.change('PUT', PARALLEL, {
            body: { beforeWorkspaceId: OUTER_WORKSPACE },
          })
        ).status,
      ).toBe(204)
      const first = '5'.repeat(40)
      f.api.pulls[4].headRefOid = first
      f.api.branches.set('refs/heads/parallel', first)
      f.api.mergeBases.set(`${TRUNK_HEAD}...${first}`, TRUNK_HEAD)
      f.api.mergeBases.set(`${first}...${HEAD_SHA}`, first)
      f.api.mergeBases.set(`${HEAD_SHA}...${TOP_HEAD}`, TRUNK_HEAD)
      if (mode === 'on a click')
        f.api.checks.set(HEAD_SHA, [
          {
            ...passedRun,
            status: 'IN_PROGRESS',
            conclusion: null,
            completedAt: null,
          },
        ])

      await f.queue.advanceStartAlarm()
      expect(await readQueue(f.db, f.scope)).toMatchObject({
        githubStackNumber: 2,
        reordering: 1,
      })
      expect((await f.entries()).at(-1)).toMatchObject({
        pullNumber: 3,
        wait: 'open-session',
      })
      if (mode === 'on a click') {
        expect(await (await f.bar(PARALLEL)).json()).toMatchObject({
          queue: { mergeAhead: 0 },
        })
        f.api.checks.set(HEAD_SHA, [passedRun])
        expect((await f.click(OUTER_WORKSPACE, 1)).status).toBe(202)
      }
      expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
        '/repos/Codertocat/Hello-World/pulls/2/merge-async',
      ])
    } finally {
      await f.dispose()
    }
  },
)
