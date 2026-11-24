import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { repositoryChangeFixture } from './repository-change.test-support'
import {
  REPOSITORY_CHANGE_JOB_KEY,
  repositoryChangeJobKey,
} from './repository-change-types'
import { readWorkspace } from './workspace-data'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

type Fixture = Awaited<ReturnType<typeof repositoryChangeFixture>>

async function startChange(f: Fixture) {
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  return pending.changeId
}

it('polls a saved repository change on its starting route across reconstruction, including a legacy move', async () => {
  const f = await repositoryChangeFixture(harness)
  const changeId = await startChange(f)
  await f.advanceTo('fetch')
  await f.coordinator.advance()
  const fetch = await f.active()
  expect(fetch).toMatchObject({
    commandRoute: 'host',
    processId: expect.any(Number),
  })
  f.reconstruct()
  await f.coordinator.advance()
  expect(f.host.statusRequests).toEqual([
    { processId: fetch?.processId, stdoutOffset: 0, stderrOffset: 0 },
  ])
  await f.host.disconnect('bx_change')
  await f.coordinator.advance()
  const move = await f.active()
  if (!move || move.processId === null) throw new Error('Expected a move.')
  expect(move).toMatchObject({ phase: 'move', commandRoute: 'provider' })
  delete move.commandRoute
  await f.storage.put(repositoryChangeJobKey(changeId), move)
  await f.storage.put(REPOSITORY_CHANGE_JOB_KEY, move)
  await f.host.connect('bx_change')
  f.reconstruct()
  await f.coordinator.advance()
  expect(f.host.statusRequests).toHaveLength(1)
  expect(f.boat.statusRequests.at(-1)).toEqual({
    processId: move.processId,
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  await f.finish()
  expect(await f.result(changeId)).toMatchObject({ state: 'changed' })
})

it('publishes the change when an admin unchose the new repository while the move ran', async () => {
  const f = await repositoryChangeFixture(harness)
  const changeId = await startChange(f)
  const job = await f.advanceTo('move')
  f.boat.commandRunning = true
  await f.coordinator.advance()
  await f.env.DB.prepare(
    "UPDATE repositories SET selected = 0 WHERE id = 'billing'",
  ).run()
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({
    phase: 'move',
    failure: { code: 'repository_unavailable' },
  })
  f.boat.commandRunning = false
  await f.finish()
  expect(await f.result(changeId)).toMatchObject({
    state: 'changed',
    workspace: { repositoryId: 'billing', branch: job.branch },
  })
  expect(await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).toMatchObject({
    repositoryId: 'billing',
    branch: job.branch,
  })
})
