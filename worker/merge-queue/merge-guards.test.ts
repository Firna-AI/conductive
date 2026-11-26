import { beforeAll, expect, it } from 'vitest'

import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { passedRun } from '../github/fake-pull'
import { queueId } from './contracts'
import { mergeFixture } from './merge.test-support'
import { MEMBER_TOKEN, queueBundle } from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('blocks both kinds of merge while a lower workspace has local work', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.db
      .prepare(
        "UPDATE workspaces SET sandbox_id = 'bx_queue_local_work', state = 'ready' WHERE id = ?",
      )
      .bind(OUTER_WORKSPACE)
      .run()
    f.boat.states.set('bx_queue_local_work', 'ready')
    f.boat.synchronousOutput = '\0' + '1\n'
    await f.queue.advanceStartAlarm()
    expect(await (await f.bar(OUTER_WORKSPACE)).json()).toMatchObject({
      queue: { wait: 'push' },
    })
    const denied = await f.click(f.top, 1)
    expect(denied.status).toBe(409)
    expect(await denied.json()).toHaveProperty(
      'error.code',
      'merge_queue_not_ready',
    )
    expect(f.writes()).toEqual([])
    f.boat.synchronousOutput = '\0' + '0\n'
    requireFeatureResult(await f.queue.wakeMergeQueue(f.scope))
    await f.queue.advanceStartAlarm()
    expect(f.writes()).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})

it('rechecks local work with a growing delay and merges after a local revert', async () => {
  const f = await mergeFixture(bundle, 'single')
  try {
    await f.db
      .prepare(
        "UPDATE workspaces SET sandbox_id = 'bx_queue_dirty', state = 'ready' WHERE id = ?",
      )
      .bind(OUTER_WORKSPACE)
      .run()
    f.boat.states.set('bx_queue_dirty', 'ready')
    f.boat.synchronousOutput = '\0' + '1\n'
    const now = await f.queue.testAlarmTime()
    await f.queue.advanceStartAlarm()
    expect(await f.queue.readStartAlarm()).toBe(now + 30_000)
    await f.queue.advanceStartAlarm(now + 30_000)
    expect(await f.queue.readStartAlarm()).toBe(now + 90_000)
    expect(f.writes()).toEqual([])
    f.boat.synchronousOutput = '\0' + '0\n'
    await f.queue.advanceStartAlarm(now + 90_000)
    expect(f.writes()).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})

it.each(['starting', 'ready'])(
  'reports an unavailable read on a %s computer',
  async (state) => {
    const f = await mergeFixture(bundle, 'single')
    try {
      const sandbox = 'bx_queue_unavailable'
      await f.db
        .prepare('UPDATE workspaces SET state = ?, sandbox_id = ? WHERE id = ?')
        .bind(state, sandbox, OUTER_WORKSPACE)
        .run()
      f.boat.states.set(sandbox, 'ready')
      f.boat.synchronousExitCode = 1
      await f.queue.advanceStartAlarm()
      expect(await (await f.bar(OUTER_WORKSPACE)).json()).toMatchObject({
        queue: { wait: 'local-work' },
      })
      expect(f.writes()).toEqual([])
    } finally {
      await f.dispose()
    }
  },
)

it('rejects a read-only clicker even with a ready prefix', async () => {
  const f = await mergeFixture(bundle)
  try {
    f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'READ')
    const denied = await f.click(f.top, 1)
    expect(denied.status).toBe(403)
    expect(await denied.json()).toHaveProperty(
      'error.code',
      'merge_queue_write_required',
    )
    expect(f.writes()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('merges a sole workspace into the trunk after confirming it belongs to no stack', async () => {
  const f = await mergeFixture(bundle, 'single')
  try {
    const click = await f.click(OUTER_WORKSPACE, 0)
    expect(click.status).toBe(409)
    await f.queue.advanceStartAlarm()
    expect(f.writes().map(({ url }) => new URL(url).pathname)).toEqual([
      '/repos/Codertocat/Hello-World/pulls/2/merge-async',
    ])
  } finally {
    await f.dispose()
  }
})

it.each(['a lower head', 'the default branch'])(
  'refuses a click when %s changes during admission',
  async (change) => {
    const f = await mergeFixture(bundle)
    try {
      let reads = 0
      f.api.onRequest = async (operation) => {
        if (operation !== 'MergeCapabilities' || ++reads !== 2) return
        if (change === 'a lower head') {
          f.api.pulls[2].headRefOid = 'new-lower-head'
          f.api.branches.set('refs/heads/changes', 'new-lower-head')
          f.api.checks.set('new-lower-head', [
            { ...passedRun, conclusion: 'FAILURE' },
          ])
        } else {
          f.api.defaultBranch = 'next'
          f.api.branches.set('refs/heads/next', 'new-trunk-head')
        }
      }
      const response = await f.click(f.top, 1)
      expect(response.status).toBe(409)
      expect(await response.json()).toHaveProperty(
        'error.code',
        'merge_queue_not_ready',
      )
      expect(f.writes()).toEqual([])
    } finally {
      await f.dispose()
    }
  },
)

it('keeps the saved poll time across a restart and early wake', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.queue.advanceStartAlarm()
    let polls = 0
    f.api.onRequest = async (operation) => {
      if (operation === 'MergeResult') polls++
    }
    const due = await f.queue.readStartAlarm()
    if (due === null) throw new Error('Expected a merge result alarm.')
    const restarted = await f.request(
      `/__test/continue-restart?workspace=${encodeURIComponent(queueId(f.scope))}`,
      { method: 'POST', body: '{}' },
    )
    expect(restarted.status).toBe(500)
    await restarted.arrayBuffer()
    const queue = f.actor(queueId(f.scope))
    requireFeatureResult(await queue.wakeMergeQueue(f.scope))
    await queue.advanceStartAlarm(due - 1)
    expect(polls).toBe(0)
    expect(await queue.readStartAlarm()).toBe(due)
    await queue.advanceStartAlarm(due)
    expect(polls).toBe(1)
    expect(f.writes()).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})

it('finishes polling before applying an archive received during the merge', async () => {
  const f = await mergeFixture(bundle, 'units')
  try {
    await f.queue.advanceStartAlarm()
    await f.db
      .prepare("UPDATE workspaces SET state = 'archived' WHERE id = ?")
      .bind(f.top)
      .run()
    requireFeatureResult(
      await f.queue.wakeMergeQueue(f.scope, {
        cause: 'archived',
        workspaceId: f.top,
        branch: f.branch,
        pullNumber: f.pullNumber,
      }),
    )
    const patches = () =>
      f.api.requests.filter(({ method }) => method === 'PATCH')
    expect(patches()).toHaveLength(0)
    f.api.checks.set(f.api.pulls[2].headRefOid, [
      { ...passedRun, conclusion: 'FAILURE' },
    ])
    for (const job of f.api.merges.jobs.values()) job.state = 'failed'
    await f.queue.advanceStartAlarm()
    await f.queue.advanceStartAlarm()
    expect(patches()).toHaveLength(1)
    expect(await patches()[0].clone().json()).toEqual({ base: 'main' })
    expect(
      await f.db
        .prepare('SELECT base_branch FROM workspaces WHERE id = ?')
        .bind(f.top)
        .first('base_branch'),
    ).toBeNull()
    expect((await f.entries()).map(({ workspaceId }) => workspaceId)).toEqual([
      OUTER_WORKSPACE,
    ])
    expect(f.writes()).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})
