import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { messageCommands } from '../chat/turn-lifecycle.test-support'
import { FakeRunner } from '../test-support/fake-runner'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { reserveContinue } from './continue-admission'
import type { ContinueOptions } from './continue-types'
import {
  NEW_FOLDER,
  OLD_FOLDER,
  repositoryChangeFixture,
} from './repository-change.test-support'
import { pendingWorkspaceChange } from './repository-change-types'
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

async function ready(
  f: Awaited<ReturnType<typeof repositoryChangeFixture>>,
  folder: string,
) {
  const runner = new FakeRunner({
    workspaceId: WORKSPACE_ID,
    repositoryFolder: folder,
  })
  await f.connect(runner)
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  return runner
}

it('holds turns, Continue, Restart, and Archive while the change runs, then moves the runner and sends the held turn on the new branch', async () => {
  const f = await repositoryChangeFixture(harness)
  const session = await f.createSession()
  const runner = await ready(f, OLD_FOLDER)
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.advanceTo('fetch')
  await f.send(session.id, 'during-change')
  await f.drain()
  expect(messageCommands(runner, 'during-change')).toEqual([])
  expect(await pendingWorkspaceChange(f.storage)).toBe(true)
  await expect(
    f.options.run(() =>
      reserveContinue(
        f.options as unknown as ContinueOptions,
        f.org.id,
        WORKSPACE_ID,
        f.ownerUser,
        { expectedBranch: 'octocat/test' },
      ),
    ),
  ).rejects.toMatchObject({ code: 'workspace_repository_changing' })
  expect(
    await f.actor.api.lifecycleRpc.softwareRestart(WORKSPACE_ID, 'begin'),
  ).toMatchObject({
    ok: false,
    error: { code: 'workspace_repository_changing' },
  })
  expect(
    await f.actor.api.lifecycleRpc.archiveWorkspace(
      f.org.id,
      WORKSPACE_ID,
      f.owner.id,
      TEST_ORIGIN,
    ),
  ).toMatchObject({
    ok: false,
    error: { code: 'workspace_repository_changing' },
  })
  await expect(f.start({}, f.ownerUser)).rejects.toMatchObject({
    code: 'workspace_repository_changing',
  })
  await f.finish()
  const row = await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)
  expect(row.repositoryId).toBe('billing')
  expect(
    runner.commands.filter((command) => command.type === 'repository.move'),
  ).toEqual([
    {
      type: 'repository.move',
      commandId: expect.any(String),
      folder: NEW_FOLDER,
      branches: { workspaceBranch: row.branch, targetBranch: 'trunk' },
    },
  ])
  expect(messageCommands(runner, 'during-change')).toEqual([])
  await f.disconnect(runner)
  const moved = await ready(f, NEW_FOLDER)
  expect(messageCommands(moved, 'during-change')).toMatchObject([
    {
      type: 'turn',
      branches: { workspaceBranch: row.branch, targetBranch: 'trunk' },
      repository: { fullName: 'example/billing', folder: NEW_FOLDER },
    },
  ])
})

it('refuses a change while Continue runs', async () => {
  const f = await repositoryChangeFixture(harness)
  await f.options.run(() =>
    reserveContinue(
      f.options as unknown as ContinueOptions,
      f.org.id,
      WORKSPACE_ID,
      f.ownerUser,
      { expectedBranch: 'octocat/test' },
    ),
  )
  await expect(f.start()).rejects.toMatchObject({
    status: 409,
    code: 'workspace_continuing',
  })
  expect(await f.active()).toBeUndefined()
})
