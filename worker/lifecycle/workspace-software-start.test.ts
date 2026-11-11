import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { workspaceResponse } from './workspace-response'
import { readWorkspaceImageRecords } from './workspace-software-data'
import { resumeWorkspace } from './workspace-resume'
import {
  currentSoftwareVersion,
  finishSoftwareStart,
  reachPhase,
  softwareResume,
} from './workspace-software-start.test-support'

const fixtureForTest = setupBackendTests()
const label = 'Updating the agent and terminal software'

it('updates an unrecorded first workspace before repository setup and runner startup', async () => {
  const fixture = fixtureForTest()
  await fixture.runtime.env.DB.prepare(
    "UPDATE image_builds SET software_version = NULL WHERE id = 'published-image'",
  ).run()
  const created = await fixture.run(() =>
    createCompletedWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const start = fixture.starts.get(created.workspace.id)
  if (!start) throw new Error('Missing first workspace start')
  const response = await workspaceResponse(
    fixture.runtime,
    fixture.org.id,
    created.workspace.id,
  )
  expect(response.start?.steps.map(({ id }) => id)).toEqual([
    'image',
    'software',
    'fetch',
    'branch',
    'startup',
    'runner',
  ])
  expect(response.start?.steps[1]).toMatchObject({ label, state: 'completed' })
  expect(
    await readWorkspaceImageRecords(
      fixture.runtime.env.DB,
      fixture.org.id,
      created.workspace.id,
    ),
  ).toMatchObject({
    softwareVersion: await currentSoftwareVersion(),
    softwareUpdateFailed: false,
  })
  expect(fixture.boat.commandRequests[0]?.command).toContain(SOFTWARE.url)
  expect(
    fixture.boat.commands.some((command) =>
      command.includes('systemctl restart conductive-runner.service'),
    ),
  ).toBe(true)
})

it('resumes an old workspace with a pinned update and persisted output checkpoints', async () => {
  const fixture = fixtureForTest()
  const start = await softwareResume(fixture)
  expect(await reachPhase(start, 'software')).toMatchObject({
    phase: 'software',
  })
  await start.advance()
  fixture.boat.commandOutput = 'update output\n'
  fixture.boat.statusChunkSize = 4
  await start.advance()
  const checkpoint = await start.job()
  expect(checkpoint).toMatchObject({
    phase: 'software',
    processId: 1,
    stdoutOffset: 4,
  })
  await start.restart()
  await start.actor.native.configure({
    environment: {
      CONDUCTIVE_RUNNER_ARCHIVE_URL:
        'https://software.conductive.test/newer.tar.gz',
      CONDUCTIVE_RUNNER_ARCHIVE_SHA256: 'b'.repeat(64),
    },
  })
  await start.advance()
  expect(fixture.boat.statusRequests.at(-1)).toMatchObject({
    processId: 1,
    stdoutOffset: 4,
  })
  expect(fixture.boat.commandRequests).toHaveLength(1)
  fixture.boat.statusChunkSize = Infinity
  await finishSoftwareStart(start)
  expect(
    await readWorkspaceImageRecords(
      fixture.runtime.env.DB,
      fixture.org.id,
      start.id,
    ),
  ).toMatchObject({ softwareVersion: await currentSoftwareVersion() })
  expect((await start.actor.endpoint().readLifecycle())?.state).toBe('ready')
})

it('skips an update when workspace software is current', async () => {
  const fixture = fixtureForTest()
  const start = await softwareResume(fixture, await currentSoftwareVersion())
  await finishSoftwareStart(start)
  const response = await workspaceResponse(
    fixture.runtime,
    fixture.org.id,
    start.id,
  )
  expect(response.start?.steps.map(({ id }) => id)).toEqual([
    'disk',
    'startup',
    'runner',
  ])
  expect(
    fixture.boat.commandRequests.filter(({ command }) =>
      command.includes(SOFTWARE.url),
    ),
  ).toEqual([])
  expect(response).toMatchObject({ workspace: { softwareUpdateFailed: false } })
})

it('starts with old software and a warning when update configuration is unavailable', async () => {
  const fixture = fixtureForTest()
  const start = await softwareResume(fixture)
  await start.actor.native.configure({
    environment: {
      CONDUCTIVE_RUNNER_ARCHIVE_URL: 'invalid-url',
    },
  })
  expect(await finishSoftwareStart(start)).toEqual({ ok: true })
  expect(
    await workspaceResponse(fixture.runtime, fixture.org.id, start.id),
  ).toMatchObject({
    workspace: { state: 'ready', softwareUpdateFailed: true },
    start: {
      steps: expect.arrayContaining([
        expect.objectContaining({ id: 'software', state: 'failed' }),
      ]),
    },
  })
  expect(
    await readWorkspaceImageRecords(
      fixture.runtime.env.DB,
      fixture.org.id,
      start.id,
    ),
  ).toMatchObject({ softwareVersion: 'old-software' })
})

it('continues after a failed update and clears the stored warning on the next successful start', async () => {
  const fixture = fixtureForTest()
  const start = await softwareResume(fixture)
  expect(await reachPhase(start, 'software')).toMatchObject({
    phase: 'software',
  })
  await start.advance()
  fixture.boat.commandExitCode = 1
  await start.advance()
  fixture.boat.commandExitCode = 0
  await finishSoftwareStart(start)
  await start.restart()
  expect(
    await workspaceResponse(fixture.runtime, fixture.org.id, start.id),
  ).toMatchObject({
    workspace: { state: 'ready', softwareUpdateFailed: true },
    start: {
      steps: expect.arrayContaining([
        expect.objectContaining({ id: 'software', label, state: 'failed' }),
      ]),
    },
  })
  expect(
    await readWorkspaceImageRecords(
      fixture.runtime.env.DB,
      fixture.org.id,
      start.id,
    ),
  ).toMatchObject({
    softwareVersion: 'old-software',
    softwareUpdateFailed: true,
  })
  expect(
    fixture.boat.commands.some((command) =>
      command.includes('systemctl restart conductive-runner.service'),
    ),
  ).toBe(true)
  await start.actor.endpoint().lifecycleStopped()
  fixture.boat.states.set(start.sandboxId, 'archived')
  await resumeWorkspace(
    fixture.runtime,
    fixture.org.id,
    start.id,
    fixture.user.id,
  )
  expect(
    await workspaceResponse(fixture.runtime, fixture.org.id, start.id),
  ).toMatchObject({ workspace: { softwareUpdateFailed: false } })
  await finishSoftwareStart(start)
  expect(
    await readWorkspaceImageRecords(
      fixture.runtime.env.DB,
      fixture.org.id,
      start.id,
    ),
  ).toMatchObject({
    softwareVersion: await currentSoftwareVersion(),
    softwareUpdateFailed: false,
  })
  expect(
    fixture.boat.commandRequests.filter(({ command }) =>
      command.includes(SOFTWARE.url),
    ),
  ).toHaveLength(2)
})
