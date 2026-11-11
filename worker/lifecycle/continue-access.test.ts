import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { continueFixture } from './continue.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('checks stored membership, org, archive, branch, merged state, and every running turn at Continue admission', async () => {
  const cases = [
    {
      name: 'member removed',
      sql: 'DELETE FROM org_members WHERE user_id = ?',
      code: 'workspace_not_found',
      status: 404,
      member: true,
    },
    {
      name: 'org suspended',
      sql: 'UPDATE orgs SET suspended_at = 1 WHERE id = ?',
      code: 'org_suspended',
      status: 403,
    },
    {
      name: 'workspace archived',
      sql: 'UPDATE workspaces SET archived_at = 1 WHERE org_id = ?',
      code: 'workspace_archived',
      status: 409,
    },
  ]
  for (const scenario of cases) {
    await harness.reset()
    const f = await continueFixture(harness)
    await f.env.DB.prepare(scenario.sql)
      .bind(scenario.member ? f.member.id : f.org.id)
      .run()
    await expect(f.start(), scenario.name).rejects.toMatchObject({
      status: scenario.status,
      code: scenario.code,
    })
    expect(await f.active(), scenario.name).toBeUndefined()
  }
  await harness.reset()
  const f = await continueFixture(harness)
  await expect(
    f.start({ expectedBranch: 'stale/branch' }),
  ).rejects.toMatchObject({ status: 409, code: 'workspace_branch_changed' })
  const pending = await f.start()
  f.api.pulls[2].state = 'OPEN'
  f.api.pulls[2].mergedAt = null
  await f.finish()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  await expect(f.result(pending.continueId)).rejects.toMatchObject({
    status: 409,
    code: 'workspace_not_merged',
  })
  const session = await f.createSession()
  const runner = await f.connect()
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  await f.send(session.id)
  await expect(f.start()).rejects.toMatchObject({
    status: 409,
    code: 'workspace_turn_running',
  })
  runner.disconnect()
})

it('rechecks a member removed while Continue waits for the real chat queue', async () => {
  const f = await continueFixture(harness)
  let release: () => void = () => {}
  let entered: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    entered = resolve
  })
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const task = f.chat.runLifecycle(async () => {
    entered()
    await held
  })
  await ready
  const request = f.start()
  try {
    await f.env.DB.prepare(
      'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(f.org.id, f.member.id)
      .run()
  } finally {
    release()
  }
  await task
  await expect(request).rejects.toMatchObject({
    status: 404,
    code: 'workspace_not_found',
  })
  expect(await f.active()).toBeUndefined()
  expect(f.boat.commands).toEqual([])
})
