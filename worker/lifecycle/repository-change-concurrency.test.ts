import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest'

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
import { LostHostReply } from './lifecycle-host-test-support'
import { repositoryChangeSettleCommand } from './repository-change-commands'
import {
  NEW_FOLDER,
  OLD_FOLDER,
  repositoryChangeFixture,
} from './repository-change.test-support'
import { pendingWorkspaceChange } from './repository-change-types'
import * as workspaceData from './workspace-data'

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
  const row = await workspaceData.readWorkspace(
    f.env.DB,
    f.org.id,
    WORKSPACE_ID,
  )
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

it('releases the reservation and delivers a held turn when the settle command fails', async () => {
  const f = await repositoryChangeFixture(harness)
  const session = await f.createSession()
  const runner = await ready(f, OLD_FOLDER)
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  const job = await f.advanceTo('publish')
  await f.send(session.id, 'during-settle')
  await f.drain()
  expect(messageCommands(runner, 'during-settle')).toEqual([])

  const settle = repositoryChangeSettleCommand(job)
  f.boat.beforeCommand = async (command) => {
    if (command === settle) throw new LostHostReply()
  }
  const readWorkspace = workspaceData.readWorkspace
  const read = vi
    .spyOn(workspaceData, 'readWorkspace')
    .mockImplementationOnce(readWorkspace)
    .mockRejectedValueOnce(new Error('The workspace record did not answer.'))
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  onTestFinished(() => {
    read.mockRestore()
    warn.mockRestore()
  })

  await f.coordinator.advance()
  expect(await f.result(pending.changeId)).toMatchObject({
    state: 'changed',
    workspace: { repositoryId: 'billing', branch: job.branch },
  })
  expect(await pendingWorkspaceChange(f.storage)).toBe(false)
  expect(read).toHaveBeenCalledTimes(1)
  expect(f.host.commandRequests.at(-1)).toMatchObject({
    command: settle,
    detached: false,
  })
  expect(warn).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'repository_change_settle_failed' }),
  )
  await f.disconnect(runner)
  const moved = await ready(f, NEW_FOLDER)
  expect(messageCommands(moved, 'during-settle')).toMatchObject([
    {
      type: 'turn',
      branches: { workspaceBranch: job.branch, targetBranch: 'trunk' },
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
