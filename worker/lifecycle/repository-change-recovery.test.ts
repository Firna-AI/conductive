import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { WarningId } from '../warning-values'
import { repositoryChangeFixture } from './repository-change.test-support'
import { AFTER_MOVE_LIMIT_MS } from './repository-change-end'
import { recordedRepositoryLocations } from './repository-location-data'
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

/** Advances once before and once at the limit, and expects the end only at the limit. */
async function expectEndAtLimit(f: Fixture, phase: 'move' | 'publish') {
  expect(await f.active()).toMatchObject({ phase, failingSince: TEST_TIME })
  f.later(AFTER_MOVE_LIMIT_MS - 1)
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({ phase, failingSince: TEST_TIME })
  f.later(1)
  await f.coordinator.advance()
  expect(await f.active()).toBeNull()
}

async function expectOldRecord(f: Fixture, changeId: string) {
  const failure = f.result(changeId)
  await expect(failure).rejects.toMatchObject({
    status: 409,
    code: 'workspace_repository_change_failed',
  })
  await expect(failure).rejects.toThrow(
    'The repository change could not finish. Try again.',
  )
  expect(await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).toMatchObject({
    repositoryId: 'repo',
    branch: 'octocat/test',
  })
  expect(f.refreshed).toEqual([])
  expect(f.controls.moves).toBe(1)
}

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

it('ends a publication whose guard never matches after the limit, and keeps the old repository', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const f = await repositoryChangeFixture(harness)
  const changeId = await startChange(f)
  await f.advanceTo('publish')
  await f.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_other' WHERE id = ?",
  )
    .bind(WORKSPACE_ID)
    .run()
  await f.coordinator.advance()
  await expectEndAtLimit(f, 'publish')
  await expectOldRecord(f, changeId)
  expect(warn).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'repository_change_ended',
      workspaceId: WarningId.checked(WORKSPACE_ID).text,
      phase: 'publish',
    }),
  )
})

it('ends a move whose branch read keeps failing after the limit, and keeps the old repository', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const f = await repositoryChangeFixture(harness)
  const changeId = await startChange(f)
  await f.advanceTo('move')
  await f.coordinator.advance()
  f.boat.commandExitCode = 125
  f.boat.synchronousExitCode = 1
  await f.coordinator.advance()
  await expectEndAtLimit(f, 'move')
  await expectOldRecord(f, changeId)
  expect(warn).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'repository_change_ended',
      workspaceId: WarningId.checked(WORKSPACE_ID).text,
      phase: 'move',
    }),
  )
})

it('releases the workspace when saving a completed clone folder fails until the limit', async () => {
  const f = await repositoryChangeFixture(harness)
  f.controls.runner = {
    state: 'hello',
    canMove: true,
    addsRepositoryFolder: true,
  }
  const pending = await f.start({ repositoryId: 'unheld', allowWork: true })
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  const locations = () => recordedRepositoryLocations(f.env.DB, WORKSPACE_ID)
  const original = await locations()
  await f.advanceTo('move')
  await f.coordinator.advance()
  await f.env.DB.prepare(
    `CREATE TRIGGER fail_clone_folder_save
    BEFORE UPDATE OF repository_locations_json ON workspace_runtime
    BEGIN SELECT RAISE(ABORT, 'Injected clone folder save failure'); END`,
  ).run()
  try {
    await f.coordinator.advance()
    const statusRequests = f.boat.statusRequests.length
    const detached = f.detached()
    f.reconstruct()
    await expectEndAtLimit(f, 'move')
    expect(f.boat.statusRequests).toHaveLength(statusRequests)
    expect(f.detached()).toEqual(detached)
    await expectOldRecord(f, pending.changeId)
    expect(await locations()).toEqual(original)
    expect(await f.start({ allowWork: true })).toMatchObject({
      state: 'pending',
    })
  } finally {
    await f.env.DB.prepare('DROP TRIGGER fail_clone_folder_save').run()
  }
})

it('keeps the retry of a publication after the limit once the record names the new repository', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const f = await repositoryChangeFixture(harness)
  const changeId = await startChange(f)
  const job = await f.advanceTo('publish')
  const assertActive = f.options.assertActive
  f.options.assertActive = async () => {
    throw new Error('The workspace object is not active.')
  }
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({
    phase: 'publish',
    failingSince: TEST_TIME,
  })
  expect(
    (await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).repositoryId,
  ).toBe('billing')
  f.later(AFTER_MOVE_LIMIT_MS + 1)
  await f.coordinator.advance()
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({ phase: 'publish' })
  f.options.assertActive = assertActive
  await f.finish()
  expect(await f.result(changeId)).toMatchObject({
    state: 'changed',
    workspace: { repositoryId: 'billing', branch: job.branch },
  })
  expect(warn).not.toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'repository_change_ended' }),
  )
})

it('gives the publication its own limit after a branch read that failed during the move', async () => {
  const f = await repositoryChangeFixture(harness)
  const changeId = await startChange(f)
  const job = await f.advanceTo('move')
  await f.coordinator.advance()
  f.boat.commandExitCode = 125
  f.inspectBranch(job.branch)
  f.boat.synchronousExitCode = 1
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({ failingSince: TEST_TIME })
  f.later(AFTER_MOVE_LIMIT_MS)
  f.boat.synchronousExitCode = 0
  await f.coordinator.advance()
  const publish = await f.active()
  expect(publish).toMatchObject({ phase: 'publish' })
  expect(publish).not.toHaveProperty('failingSince')
  await f.finish()
  expect(await f.result(changeId)).toMatchObject({ state: 'changed' })
})
