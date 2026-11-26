import { beforeAll, expect, it } from 'vitest'
import { workspacesPath } from '../../src/shared/workspaces'
import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { queueId } from './contracts'
import { readQueue } from './data'
import {
  FOREIGN,
  MEMBER_TOKEN,
  OWNER_TOKEN,
  queueBundle,
} from './queue.test-support'
import { mergeFixture } from './merge.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('retries stack cleanup as the member who removed the unit and rechecks access', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.db.exec("UPDATE merge_queues SET stack_writer_user_id = 'owner'")
    f.api.merges.memberPermissions.set(OWNER_TOKEN, 'READ')
    expect(
      (
        await f.change('DELETE', OUTER_WORKSPACE, {
          cookie: f.cookies.memberCookie,
        })
      ).status,
    ).toBe(204)
    expect(await f.entries()).toEqual([])
    const unstackTokens = () =>
      f.api.requests
        .filter(({ url }) => url.endsWith('/unstack'))
        .map(({ headers }) => headers.get('Authorization'))
    f.api.stacks.lockedPulls.add(2).add(3)
    const now = await f.queue.testAlarmTime()
    await f.queue.advanceStartAlarm()
    expect(unstackTokens()).toEqual([`Bearer ${MEMBER_TOKEN}`])
    expect(await f.queue.readStartAlarm()).toBe(now + 30_000)

    const restarted = await f.request(
      `/__test/continue-restart?workspace=${encodeURIComponent(queueId(f.scope))}`,
      { method: 'POST', body: '{}' },
    )
    expect(restarted.status).toBe(500)
    await restarted.arrayBuffer()
    const queue = f.actor(queueId(f.scope))
    f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'READ')
    f.api.stacks.lockedPulls.clear()
    await queue.advanceStartAlarm(now + 30_000)
    expect(unstackTokens()).toEqual([`Bearer ${MEMBER_TOKEN}`])
    expect(await queue.readStartAlarm()).toBe(now + 90_000)

    f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'WRITE')
    await queue.advanceStartAlarm(now + 90_000)
    expect(unstackTokens()).toEqual([
      `Bearer ${MEMBER_TOKEN}`,
      `Bearer ${MEMBER_TOKEN}`,
    ])
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: null,
    })
  } finally {
    await f.dispose()
  }
})

it('cleans an empty stack as the workspace owner when the creator has left the org', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.db.batch([
      f.db.prepare("UPDATE merge_queues SET stack_writer_user_id = 'member'"),
      f.db
        .prepare(
          "DELETE FROM org_members WHERE org_id = ? AND user_id = 'member'",
        )
        .bind(f.scope.orgId),
    ])
    requireFeatureResult(
      await f.queue.wakeMergeQueue(f.scope, {
        cause: 'archived',
        workspaceId: OUTER_WORKSPACE,
        branch: 'changes',
        pullNumber: 2,
      }),
    )
    expect(await f.entries()).toEqual([])
    await f.queue.advanceStartAlarm()
    const tokens = f.api.requests
      .filter(({ url }) => url.endsWith('/unstack'))
      .map(({ headers }) => headers.get('Authorization'))
    expect(tokens).toEqual([`Bearer ${OWNER_TOKEN}`])
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: null,
    })
  } finally {
    await f.dispose()
  }
})

it('lets another org join an empty queue repository and backs off blocked cleanup', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.db.batch([
      f.db.prepare('DELETE FROM merge_queue_entries'),
      f.db.prepare("UPDATE merge_queues SET stack_writer_user_id = 'owner'"),
    ])
    f.api.merges.memberPermissions.set(OWNER_TOKEN, 'READ')
    const other = { orgId: 'other-org', cookie: f.cookies.outsiderCookie }
    const list = async (queueInUse: boolean) =>
      expect(
        await (
          await f.request(workspacesPath(other.orgId), {
            headers: { Cookie: other.cookie },
          })
        ).json(),
      ).toMatchObject({ repositories: [{ queueInUse }] })
    await f.db.exec('UPDATE merge_queues SET creating_stack = 1')
    await list(true)
    expect((await f.change('POST', FOREIGN, other)).status).toBe(409)
    await f.db.exec('UPDATE merge_queues SET creating_stack = 0')
    await list(false)
    expect((await f.change('POST', FOREIGN, other)).status).toBe(204)
    const now = await f.queue.testAlarmTime()
    await f.queue.advanceStartAlarm()
    expect(await f.queue.readStartAlarm()).toBe(now + 30_000)
    f.api.failure = Response.json({}, { status: 503 })
    await f.queue.advanceStartAlarm(now + 30_000)
    expect(await f.queue.readStartAlarm()).toBe(now + 90_000)
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: 1,
    })
  } finally {
    await f.dispose()
  }
})

it('keeps a saved stack of an empty foreign queue outside the current queue', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.db.batch([
      f.db.prepare('UPDATE merge_queues SET github_stack_number = NULL'),
      f.db
        .prepare(
          `INSERT INTO merge_queues (
        id, org_id, repository_id, github_repository_id, trunk, github_stack_number,
        created_at, updated_at
      ) VALUES ('foreign-queue', 'other-org', 'foreign-repo', ?, 'main', 1, 1, 1)`,
        )
        .bind(f.scope.githubRepositoryId),
    ])
    await f.queue.advanceStartAlarm()
    expect(await readQueue(f.db, f.scope)).toMatchObject({
      githubStackNumber: null,
    })
    expect(f.writes()).toEqual([])
    expect(f.api.requests.some(({ url }) => url.endsWith('/unstack'))).toBe(
      false,
    )
  } finally {
    await f.dispose()
  }
})
