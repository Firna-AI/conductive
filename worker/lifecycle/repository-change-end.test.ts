import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { WarningId } from '../warning-values'
import { LostHostReply } from './lifecycle-host-test-support'
import { repositoryChangeFixture } from './repository-change.test-support'
import { readWorkspace } from './workspace-data'

const END_LIMIT_MS = 600_000

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
async function expectEndAtLimit(
  f: Fixture,
  phase: 'fetch' | 'move' | 'publish',
) {
  expect(await f.active()).toMatchObject({ phase, failingSince: TEST_TIME })
  f.later(END_LIMIT_MS - 1)
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

it.each([
  { phase: 'move', drop: 'after a failed branch read' },
  { phase: 'move', drop: 'during the branch read' },
  { phase: 'move', drop: 'while the checkout runs' },
  { phase: 'fetch', drop: 'while the fetch runs' },
] as const)(
  'ends the $phase at its limit when the host drops $drop',
  async ({ phase, drop }) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const f = await repositoryChangeFixture(harness)
    const changeId = await startChange(f)
    await f.advanceTo(phase)
    await f.coordinator.advance()

    if (drop === 'after a failed branch read') {
      f.boat.commandExitCode = 125
      f.boat.synchronousExitCode = 1
      await f.coordinator.advance()
    } else if (drop === 'during the branch read') {
      f.boat.commandExitCode = 125
      f.boat.beforeCommand = async () => {
        throw new LostHostReply()
      }
      await f.coordinator.advance()
    } else {
      f.boat.commandRunning = true
      await f.coordinator.advance()
    }
    await f.host.disconnect('bx_change')
    await f.coordinator.advance()
    f.reconstruct()
    await expectEndAtLimit(f, phase)
    await expectOldRecord(f, changeId)
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'repository_change_ended',
        workspaceId: WarningId.checked(WORKSPACE_ID).text,
        phase,
      }),
    )
  },
)

it('reports the saved owner suspension when a fetch reaches its failure limit', async () => {
  const f = await repositoryChangeFixture(harness)
  const changeId = await startChange(f)
  await f.advanceTo('fetch')
  await f.coordinator.advance()

  const setSuspension = f.env.DB.prepare(
    'UPDATE users SET suspended_at = ? WHERE id = ?',
  )
  await setSuspension.bind(TEST_TIME, f.ownerUser.id).run()
  await f.host.disconnect('bx_change')
  await f.coordinator.advance()
  const failure = {
    status: 403,
    code: 'user_suspended',
    message:
      'The workspace owner is suspended. Ask an admin to assign another member.',
  }
  expect(await f.active()).toMatchObject({ failure })

  await setSuspension.bind(null, f.ownerUser.id).run()
  f.reconstruct()
  await expectEndAtLimit(f, 'fetch')
  await expect(f.result(changeId)).rejects.toMatchObject(failure)
})

it('counts a failed journal reattach and clears its timer when the fetch status is running', async () => {
  const f = await repositoryChangeFixture(harness)
  await startChange(f)
  await f.advanceTo('fetch')
  await f.coordinator.advance()
  f.host.statusReply = (_request, reply) =>
    reply.kind === 'command.status'
      ? { ...reply, state: 'lost', running: false, exitCode: null }
      : reply
  await f.coordinator.advance()
  const beforeCommand = f.boat.beforeCommand
  f.boat.beforeCommand = async () => {
    throw new LostHostReply()
  }
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({
    phase: 'fetch',
    processId: null,
    failingSince: TEST_TIME,
  })
  f.boat.beforeCommand = beforeCommand
  delete f.host.statusReply
  await f.host.connect('bx_change')
  await f.coordinator.advance()
  f.later(END_LIMIT_MS - 1)
  f.boat.commandRunning = true
  await f.coordinator.advance()
  expect(await f.active()).not.toHaveProperty('failingSince')
  await f.host.disconnect('bx_change')
  f.later(1)
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({
    phase: 'fetch',
    failingSince: TEST_TIME + END_LIMIT_MS,
  })
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
  f.later(END_LIMIT_MS + 1)
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
  f.later(END_LIMIT_MS)
  f.boat.synchronousExitCode = 0
  await f.coordinator.advance()
  const publish = await f.active()
  expect(publish).toMatchObject({ phase: 'publish' })
  expect(publish).not.toHaveProperty('failingSince')
  await f.finish()
  expect(await f.result(changeId)).toMatchObject({ state: 'changed' })
})
