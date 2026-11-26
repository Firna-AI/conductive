import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import type { DurableLifecycleState } from './durable-types'
import { repositoryChangeFixture } from './repository-change.test-support'
import { readWorkspace } from './workspace-data'

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

it('refuses a change without access, a chosen repository, or a workspace folder record', async () => {
  const cases = [
    {
      name: 'member removed',
      sql: 'DELETE FROM org_members WHERE user_id = ?',
      bind: 'member',
      status: 404,
      code: 'workspace_not_found',
    },
    {
      name: 'org suspended',
      sql: 'UPDATE orgs SET suspended_at = 1 WHERE id = ?',
      status: 403,
      code: 'org_suspended',
    },
    {
      name: 'workspace archived',
      sql: 'UPDATE workspaces SET archived_at = 1 WHERE org_id = ?',
      status: 409,
      code: 'workspace_archived',
    },
    {
      name: 'repository not chosen',
      sql: "UPDATE repositories SET selected = 0 WHERE id = 'billing' AND org_id = ?",
      status: 404,
      code: 'repository_unavailable',
    },
    {
      name: 'workspace without a record of its folders',
      sql: 'UPDATE workspace_runtime SET repository_locations_json = NULL WHERE org_id = ?',
      status: 404,
      code: 'repository_unavailable',
    },
  ]
  for (const scenario of cases) {
    await harness.reset()
    const f = await repositoryChangeFixture(harness)
    await f.env.DB.prepare(scenario.sql)
      .bind(scenario.bind === 'member' ? f.member.id : f.org.id)
      .run()
    await expect(f.start(), scenario.name).rejects.toMatchObject({
      status: scenario.status,
      code: scenario.code,
    })
    expect(await f.active(), scenario.name).toBeUndefined()
  }
  await harness.reset()
  const f = await repositoryChangeFixture(harness)
  await expect(f.start({ repositoryId: 'repo' })).rejects.toMatchObject({
    status: 409,
    code: 'workspace_repository_current',
  })
  await expect(
    f.start({ expectedBranch: 'stale/branch' }),
  ).rejects.toMatchObject({ status: 409, code: 'workspace_repository_changed' })
  f.controls.lifecycle = {
    state: 'starting',
    softwareRestartAt: 1,
  } as DurableLifecycleState
  await expect(f.start()).rejects.toMatchObject({
    status: 409,
    code: 'workspace_restarting',
  })
  expect(f.boat.commandRequests).toEqual([])
})

it('refuses a clone at admission and after resume when the runner can move only to known folders', async () => {
  const f = await repositoryChangeFixture(harness)
  const request = { repositoryId: 'unheld', allowWork: true }
  const outdated = {
    status: 409,
    code: 'workspace_software_outdated',
    message: 'Restart the software, then try again.',
  }
  await expect(f.start(request)).rejects.toMatchObject(outdated)
  expect(await f.active()).toBeUndefined()

  await f.env.DB.prepare("UPDATE workspaces SET state = 'stopped' WHERE id = ?")
    .bind(WORKSPACE_ID)
    .run()
  f.controls.runner = { state: 'none' }
  const pending = await f.start(request)
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.advanceTo('runner')
  expect(f.resumed).toEqual([WORKSPACE_ID])
  f.controls.runner = { state: 'hello', canMove: true }
  await f.finish()
  await expect(f.result(pending.changeId)).rejects.toMatchObject(outdated)
  expect(f.boat.commandRequests).toEqual([])
})

it('refuses a change while a turn runs', async () => {
  const f = await repositoryChangeFixture(harness)
  const session = await f.createSession()
  const runner = await f.connect()
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  await f.send(session.id)
  await expect(f.start()).rejects.toMatchObject({
    status: 409,
    code: 'workspace_turn_running',
    message: 'Wait for the agent to finish, then try again.',
  })
  expect(await f.active()).toBeUndefined()
  runner.disconnect()
})

it('refuses a runner that cannot move with "Restart the software, then try again.", at admission and after a resume', async () => {
  const f = await repositoryChangeFixture(harness)
  f.controls.runner = { state: 'hello', canMove: false }
  await expect(f.start()).rejects.toMatchObject({
    status: 409,
    code: 'workspace_software_outdated',
    message: 'Restart the software, then try again.',
  })
  expect(await f.active()).toBeUndefined()
  await f.env.DB.prepare("UPDATE workspaces SET state = 'stopped' WHERE id = ?")
    .bind(WORKSPACE_ID)
    .run()
  f.controls.runner = { state: 'none' }
  const pending = await f.start({}, f.ownerUser)
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.advanceTo('runner')
  expect(f.resumed).toEqual([WORKSPACE_ID])
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({ phase: 'runner' })
  f.controls.runner = { state: 'hello', canMove: false }
  await f.finish()
  await expect(f.result(pending.changeId, f.ownerUser)).rejects.toMatchObject({
    status: 409,
    code: 'workspace_software_outdated',
    message: 'Restart the software, then try again.',
  })
  expect(f.boat.commandRequests.filter(({ detached }) => detached)).toEqual([])
  expect(
    (await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).repositoryId,
  ).toBe('repo')
})

it('ends a change whose runner does not say hello in time', async () => {
  const f = await repositoryChangeFixture(harness)
  f.controls.runner = { state: 'none' }
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.advanceTo('runner')
  await f.coordinator.advance()
  f.later(3 * 60 * 1_000)
  await f.finish()
  await expect(f.result(pending.changeId)).rejects.toThrow(
    "The cloud computer isn't ready. Try again.",
  )
})
