import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { encrypt } from '../security/crypto'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { REPOSITORY_CHANGE_JOB_KEY } from './repository-change-types'
import {
  OLD_FOLDER,
  repositoryChangeFixture,
} from './repository-change.test-support'
import { recordedRepositoryLocations } from './repository-location-data'
import { orgEnvironmentContext } from './settings-data'
import { recordRunningEnvironment } from './start-environment'
import { readWorkspace } from './workspace-data'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const request = { repositoryId: 'unheld', allowWork: true }
const capable = {
  state: 'hello',
  canMove: true,
  addsRepositoryFolder: true,
} as const

it('records a cloned repository before publication and sends its variable to the runner', async () => {
  const f = await repositoryChangeFixture(harness)
  f.controls.runner = capable
  f.diskNames.push('Unheld', 'UNHELD-2')
  await recordRunningEnvironment(
    f.env.DB,
    WORKSPACE_ID,
    await encrypt(
      JSON.stringify({
        CONDUCTIVE_REPOSITORY_UNHELD_3_DIR: 'configured-folder',
      }),
      orgEnvironmentContext(f.org.id),
      f.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  )
  const runner = await f.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      repositoryFolder: OLD_FOLDER,
      addsRepositoryFolder: true,
    }),
  )
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  const pending = await f.start(request)
  expect(pending).toMatchObject({ state: 'pending' })
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  const move = await f.advanceTo('move')
  const directory = '/home/user/code/unheld-3'
  const variable = 'CONDUCTIVE_REPOSITORY_UNHELD_3_2_DIR'
  const location = { repositoryId: 'unheld', directory, variable }
  const locations = () => recordedRepositoryLocations(f.env.DB, WORKSPACE_ID)
  const original = await locations()
  expect(move.target).toMatchObject({ directory, clone: { variable } })
  expect(
    f.boat.commands.filter((command) => command.includes('git status')),
  ).toEqual([expect.stringContaining(`cd '${OLD_FOLDER}'`)])
  expect(f.detached().map(({ command }) => command)).toEqual([
    expect.stringContaining('clone --bare --tags'),
  ])
  await f.coordinator.advance()
  const started = await f.active()
  if (!started) throw new Error('Expected a running move.')
  expect(await locations()).toEqual(original)
  f.boat.commandExitCode = 125
  f.inspectBranch(move.branch)
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({ phase: 'publish' })
  expect(await locations()).toEqual([...(original ?? []), location])
  expect(await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).toMatchObject({
    repositoryId: 'repo',
  })

  // The Worker can lose its job save after D1 has already recorded the clone.
  await f.storage.put(REPOSITORY_CHANGE_JOB_KEY, started)
  f.reconstruct()
  await f.coordinator.advance()
  expect(await locations()).toEqual([...(original ?? []), location])
  await f.finish()
  expect(await f.result(pending.changeId)).toMatchObject({
    state: 'changed',
    workspace: { repositoryId: 'unheld', branch: move.branch },
  })
  expect(
    runner.commands.filter(({ type }) => type === 'repository.move'),
  ).toEqual([
    {
      type: 'repository.move',
      commandId: expect.any(String),
      folder: directory,
      branches: { workspaceBranch: move.branch, targetBranch: 'trunk' },
      variable,
    },
  ])
  expect(f.boat.commands).toContainEqual(
    expect.stringContaining(`set-environment -g '${variable}' '${directory}'`),
  )
  await f.disconnect(runner)
})

it('keeps the original folder record when the clone fails before the move', async () => {
  const f = await repositoryChangeFixture(harness)
  f.controls.runner = capable
  const original = await recordedRepositoryLocations(f.env.DB, WORKSPACE_ID)
  const pending = await f.start(request)
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.advanceTo('move')
  await f.coordinator.advance()
  f.boat.commandExitCode = 1
  f.inspectBranch('')
  await f.finish()
  await expect(f.result(pending.changeId)).rejects.toMatchObject({
    status: 409,
    code: 'workspace_repository_change_failed',
  })
  expect(await recordedRepositoryLocations(f.env.DB, WORKSPACE_ID)).toEqual(
    original,
  )
  expect(await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).toMatchObject({
    repositoryId: 'repo',
    branch: 'octocat/test',
  })
})

it('keeps the replacement computer folder record when a clone finishes on the old computer', async () => {
  const f = await repositoryChangeFixture(harness)
  f.controls.runner = capable
  const original = await recordedRepositoryLocations(f.env.DB, WORKSPACE_ID)
  const pending = await f.start(request)
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.advanceTo('move')
  await f.coordinator.advance()
  await f.env.DB.prepare('UPDATE workspaces SET sandbox_id = ? WHERE id = ?')
    .bind('bx_replacement', WORKSPACE_ID)
    .run()
  await f.finish()
  await expect(f.result(pending.changeId)).rejects.toMatchObject({
    status: 409,
    code: 'sandbox_unavailable',
  })
  expect(await recordedRepositoryLocations(f.env.DB, WORKSPACE_ID)).toEqual(
    original,
  )
})
