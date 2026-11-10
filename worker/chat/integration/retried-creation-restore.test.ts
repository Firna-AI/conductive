import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../../src/shared/workspaces'
import {
  admitRetainedCreation,
  advanceRetainedCreation,
  completeRetainedCreation,
  deleteAndRestoreCreation,
  retainedCreationFixture,
  retainedCreationJob,
  type RetainedCreationFixture,
} from '../../features/retained-creation.test-support'
import { shellQuote } from '../../lifecycle/commands'
import { seedPublishedImage } from '../../lifecycle/published-image-test-support'
import { localSavedScriptFixture } from '../../lifecycle/saved-script-test-support'
import type { WorkspaceStartResult } from '../../lifecycle/start-types'
import type { CommandResult } from '../../sandbox/provider'
import { outerWorkerBundle } from './outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SOFTWARE,
} from './outer-seed.test-support'
import { driveWorkspaceStart } from './workspace-start.test-support'

let bundle: string
let fixture: RetainedCreationFixture | undefined
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

it('restores an interrupted replacement create with its pinned data and a fresh command journal', async () => {
  const active = (fixture = await retainedCreationFixture(bundle))
  const sandbox = (local = await localSavedScriptFixture(OUTER_REPOSITORY))
  const { id } = await admitRetainedCreation(active)
  active.boat.commandExitCode = 1
  expect(
    await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
      active.actor(id),
      active.actor(id).waitCreationLifecycle(),
    ),
  ).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed' },
  })
  expect(active.boat.deletedIds).toEqual(['bx_1'])

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
  const publishImage = (imageName: string) =>
    seedPublishedImage(active.env.DB, {
      orgId: OUTER_ORG,
      buildId: `${imageName}-build`,
      imageName,
      runnerProtocolVersion: 1,
      repositories: [
        {
          id: OUTER_REPOSITORY,
          orgId: OUTER_ORG,
          fullName: 'owner/repository',
          defaultBranch: 'main',
        },
      ],
      software: OUTER_SOFTWARE,
      now: 3_000_000_000_000,
    })
  await publishImage('replacement-image')
  const resume = () =>
    active.request(workspacePaths.resume(OUTER_ORG, id), {
      method: 'POST',
      body: '{}',
    })
  active.boat.commandExitCode = 0
  expect((await resume()).status).toBe(200)
  expect(await active.actor(id).readCreationLifecycleResult()).toBeUndefined()
  await advanceRetainedCreation(active, id, 'startup')
  const results: CommandResult[] = []
  active.boat.beforeCommand = async (command, detached) => {
    if (!detached || !sandbox.contains(command, 'startup')) return
    const result = await sandbox.run(command)
    results.push(result)
    active.boat.commandExitCode = result.exitCode ?? -1
  }
  await active.actor(id).advanceStartAlarm()
  expect(results.map((result) => result.exitCode)).toEqual([125])
  const original = await retainedCreationJob(active, id)
  expect(original).toMatchObject({
    phase: 'startup',
    processId: expect.any(Number),
    allocatedSandboxId: 'bx_2',
    imageName: 'replacement-image',
  })
  const commandsBefore = active.boat.commandRequests.length
  await deleteAndRestoreCreation(active)
  expect(active.boat.stopIds).toEqual(['bx_2'])
  expect(active.boat.resumeIds).toEqual([])
  await publishImage('later-image')
  await active.env.DB.prepare(
    'UPDATE settings SET startup_script = ? WHERE org_id = ?',
  )
    .bind('exit 47', OUTER_ORG)
    .run()
  expect((await resume()).status).toBe(200)
  expect(await retainedCreationJob(active, id)).toMatchObject({
    kind: 'create',
    phase: 'machine',
    attempt: original.attempt,
    commandAttempt: expect.stringContaining(`${original.attempt}:restore:`),
    afterReadyPhase: 'startup',
    allocatedSandboxId: 'bx_2',
    createPayloadCiphertext: original.createPayloadCiphertext,
    imageName: 'replacement-image',
    startupScript: original.startupScript,
    defaultBranch: original.defaultBranch,
    repositoryLocations: original.repositoryLocations,
    admission: original.admission,
    creation: original.creation,
  })
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
  expect(active.boat.starts).toHaveLength(2)
  expect(active.boat.resumeIds).toEqual(['bx_2'])
  expect(active.boat.deletedIds).toEqual(['bx_1'])
})
