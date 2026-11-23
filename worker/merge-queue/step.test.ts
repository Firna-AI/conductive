import { beforeAll, expect, it } from 'vitest'

import {
  OTHER_WORKSPACE,
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { queueId, type QueueEntry, type QueueLeave } from './contracts'
import { readQueue } from './data'
import { leaveOrder } from './order'
import { queueBundle, queueFixture } from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('keeps the unit after a trunk rename and empties it after a default switch', async () => {
  const f = await queueFixture(bundle)
  try {
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    const name = queueId(f.scope)
    const wake = async () => {
      requireFeatureResult(await f.actor(name).wakeMergeQueue(f.scope))
      await f.actor(name).advanceStartAlarm()
    }
    f.api.defaultBranch = 'trunk'
    f.api.branches.set('refs/heads/trunk', 'main-commit')
    f.api.branches.delete('refs/heads/main')
    f.api.pulls[2].baseRefName = 'trunk'
    await f.db
      .prepare('UPDATE repositories SET default_branch = ? WHERE id = ?')
      .bind('trunk', OUTER_REPOSITORY)
      .run()
    await wake()
    expect(await readQueue(f.db, f.scope)).toMatchObject({ trunk: 'trunk' })
    expect((await f.entries()).map(({ workspaceId }) => workspaceId)).toEqual([
      OUTER_WORKSPACE,
      OTHER_WORKSPACE,
    ])
    f.api.defaultBranch = 'next'
    f.api.branches.set('refs/heads/next', 'next-commit')
    await f.db
      .prepare('UPDATE repositories SET default_branch = ? WHERE id = ?')
      .bind('next', OUTER_REPOSITORY)
      .run()
    await wake()
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('settles saved work on the queue alarm after a restart', async () => {
  const f = await queueFixture(bundle)
  try {
    expect(
      (
        await f.change('POST', OTHER_WORKSPACE, {
          cookie: f.cookies.memberCookie,
        })
      ).status,
    ).toBe(204)
    const name = queueId(f.scope)
    await f.db
      .prepare(
        "DELETE FROM org_members WHERE org_id = ? AND user_id = 'member'",
      )
      .bind(f.scope.orgId)
      .run()
    requireFeatureResult(await f.actor(name).wakeMergeQueue(f.scope))
    const before = await f.actor(name).inspectFeatureConnections()
    const interrupted = await f.request(
      `/__test/continue-restart?workspace=${encodeURIComponent(name)}`,
      { method: 'POST', body: '{}' },
    )
    expect(interrupted.status).toBe(500)
    await interrupted.arrayBuffer()
    const after = await f.actor(name).inspectFeatureConnections()
    expect(after.instance).not.toBe(before.instance)
    await f.actor(name).advanceStartAlarm()
    expect(await f.entries()).toEqual([])
    expect(await readQueue(f.db, f.scope)).toMatchObject({ pendingWrite: null })
  } finally {
    await f.dispose()
  }
})

const entry = (name: string, number: number, unitId: string): QueueEntry => ({
  queueId: 'queue',
  workspaceId: name,
  branch: name,
  place: number,
  unitId,
  pullNumber: number,
  state: 'queued',
  wait: null,
  queuerUserId: 'member',
  queuedAt: 1,
  stepAt: 1,
})

it('uses the same suffix rule for workspace departures and keeps upper layers after a merge', () => {
  const bottom = entry('bottom', 1, 'first')
  const middle = entry('middle', 2, 'first')
  const top = entry('top', 3, 'first')
  const other = entry('other', 4, 'second')
  const entries = [bottom, middle, top, other]
  const target = {
    workspaceId: middle.workspaceId,
    branch: middle.branch,
    pullNumber: middle.pullNumber,
  }
  const causes: Extract<QueueLeave, { workspaceId: string }>['cause'][] = [
    'closed',
    'draft',
    'archived',
    'repository-changed',
    'branch-changed',
    'continued',
    'removed',
    'base-changed',
    'queuer-left',
    'write-access-lost',
  ]
  for (const cause of causes)
    expect(leaveOrder(entries, { ...target, cause }), cause).toEqual({
      remaining: [bottom, other],
      removed: [middle, top],
    })
  expect(leaveOrder(entries, { ...target, cause: 'merged' })).toEqual({
    remaining: [bottom, top, other],
    removed: [middle],
  })
  expect(
    leaveOrder(entries, {
      ...target,
      branch: 'old-branch',
      cause: 'continued',
    }),
  ).toEqual({
    remaining: entries,
    removed: [],
  })
  expect(leaveOrder(entries, { cause: 'org-suspended' })).toEqual({
    remaining: [],
    removed: entries,
  })
})
