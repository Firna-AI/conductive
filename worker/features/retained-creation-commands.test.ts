import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../src/shared/workspaces'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { shellQuote } from '../lifecycle/commands'
import {
  readRepositoryLocations,
  repositoryLocation,
} from '../lifecycle/repository-locations'
import { localSavedScriptFixture } from '../lifecycle/saved-script-test-support'
import type { CommandResult } from '../sandbox/provider'
import { featureFixture, type FeatureFixture } from './fixture.test-support'
import {
  admitRetainedCreation,
  advanceRetainedCreation,
  completeRetainedCreation,
  deleteAndRestoreCreation,
  retainedCreationJob,
  RETAINED_CONFIGURATION,
} from './retained-creation.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
let local: Awaited<ReturnType<typeof localSavedScriptFixture>> | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/checkpoint-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  await local?.dispose()
  fixture = undefined
  local = undefined
})

it('replays a saved branch after Restore with a new journal and preserves the existing branch and its files', async () => {
  const active = (fixture = await featureFixture(bundle, {
    configuration: RETAINED_CONFIGURATION,
  }))
  const sandbox = (local = await localSavedScriptFixture(OUTER_REPOSITORY))
  const { id, branch } = await admitRetainedCreation(active)
  const original = await advanceRetainedCreation(active, id, 'branch')
  const directory = shellQuote(
    repositoryLocation(
      readRepositoryLocations(original.repositoryLocations),
      OUTER_REPOSITORY,
    ),
  )
  const initialized = await sandbox.run(
    [
      `mkdir -p ${directory}`,
      `cd ${directory}`,
      'git init -b main',
      "printf 'committed\\n' > tracked",
      'git add tracked',
      'git -c user.name=Fixture -c user.email=fixture@example.test -c commit.gpgsign=false commit -m initial',
      'git fetch . main',
    ].join('\n'),
  )
  expect(initialized.exitCode, JSON.stringify(initialized)).toBe(0)
  const results: CommandResult[] = []
  active.boat.beforeCommand = async (command, detached) => {
    if (!detached || !command.includes('git checkout')) return
    const result = await sandbox.run(command)
    results.push(result)
    active.boat.commandExitCode = result.exitCode ?? -1
  }
  await active.actor(id).advanceStartAlarm()
  expect(
    results.map((result) => result.exitCode),
    JSON.stringify(results),
  ).toEqual([0])
  expect(
    (
      await sandbox.run(
        [
          `cd ${directory}`,
          "printf 'edited\\n' > tracked",
          "printf 'untracked work\\n' > untracked",
        ].join('\n'),
      )
    ).exitCode,
  ).toBe(0)
  const commandsBefore = active.boat.commandRequests.length
  await deleteAndRestoreCreation(active)
  expect(
    (
      await active.request(workspacePaths.resume(OUTER_ORG, id), {
        method: 'POST',
        body: '{}',
      })
    ).status,
  ).toBe(200)
  expect(await completeRetainedCreation(active, id)).toEqual({ ok: true })
  expect(results.map((result) => result.exitCode)).toEqual([0, 0])
  const commands = active.boat.commandRequests
    .slice(commandsBefore)
    .filter((request) => request.detached)
    .map((request) => request.command)
  expect(commands).toEqual([
    expect.stringContaining('git checkout'),
    expect.stringContaining('/run/conductive/startup.sh'),
    expect.stringContaining('systemctl start conductive-terminal.service'),
  ])
  expect(commands[0]).not.toBe(
    active.boat.commandRequests[commandsBefore - 1]?.command,
  )
  expect(
    (
      await sandbox.run(
        [
          `cd ${directory}`,
          'git branch --show-current',
          'git show HEAD:tracked',
          'cat tracked untracked',
        ].join('\n'),
      )
    ).stdout,
  ).toBe(`${branch}\ncommitted\nedited\nuntracked work\n`)
  expect(active.boat.resumeIds).toEqual([original.allocatedSandboxId])
  expect(active.boat.deletedIds).toEqual([])
})

it('runs interrupted saved startup after Restore instead of following its dead journal owner', async () => {
  const active = (fixture = await featureFixture(bundle, {
    configuration: RETAINED_CONFIGURATION,
  }))
  const sandbox = (local = await localSavedScriptFixture(OUTER_REPOSITORY))
  const marker = shellQuote(`${sandbox.directory}/interrupted`)
  const journal = shellQuote(`${sandbox.directory}/command-journal/workspace`)
  const script = [
    'set -eu',
    `if [ ! -f ${marker} ]; then`,
    `  : > ${marker}`,
    `  for checkpoint_owner in ${journal}/*/*/startup/owner; do`,
    '    kill -KILL "$(readlink -- "$checkpoint_owner")"',
    '  done',
    '  exit 9',
    'fi',
    `printf 'continued\\n' > ${shellQuote(`${sandbox.directory}/completed`)}`,
  ].join('\n')
  await active.env.DB.prepare(
    'UPDATE settings SET startup_script = ? WHERE org_id = ?',
  )
    .bind(script, OUTER_ORG)
    .run()
  const results: CommandResult[] = []
  active.boat.beforeCommand = async (command, detached) => {
    if (!detached || !sandbox.contains(command, 'startup')) return
    const result = await sandbox.run(command)
    results.push(result)
    active.boat.commandExitCode = result.exitCode ?? -1
  }
  const { id } = await admitRetainedCreation(active)
  const original = await advanceRetainedCreation(active, id, 'startup')
  await active.actor(id).advanceStartAlarm()
  expect(results.map((result) => result.exitCode)).toEqual([125])
  expect(await retainedCreationJob(active, id)).toMatchObject({
    phase: 'startup',
    processId: expect.any(Number),
  })
  const commandsBefore = active.boat.commandRequests.length
  await deleteAndRestoreCreation(active)
  expect(
    (
      await active.request(workspacePaths.resume(OUTER_ORG, id), {
        method: 'POST',
        body: '{}',
      })
    ).status,
  ).toBe(200)
  expect(await completeRetainedCreation(active, id)).toEqual({ ok: true })
  expect(results.map((result) => result.exitCode)).toEqual([125, 0])
  expect(await sandbox.file('completed')).toBe('continued\n')
  expect(await sandbox.ready()).toBe('')
  expect(await sandbox.runnerCalls()).toBe('runner-restarted\n')
  const commands = active.boat.commandRequests
    .slice(commandsBefore)
    .filter((request) => request.detached)
    .map((request) => request.command)
  expect(commands).toEqual([
    expect.stringContaining('/run/conductive/startup.sh'),
    expect.stringContaining('systemctl start conductive-terminal.service'),
  ])
  expect(commands[0]).not.toBe(
    active.boat.commandRequests[commandsBefore - 1]?.command,
  )
  expect(active.boat.resumeIds).toEqual([original.allocatedSandboxId])
  expect(active.boat.deletedIds).toEqual([])
})
