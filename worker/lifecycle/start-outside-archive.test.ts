import { expect, it } from 'vitest'

import { heldOperation } from '../test-support/held-operation'
import { archiveActions } from './archive-test-support'
import { ARCHIVE_STATE_KEY, type WorkspaceArchiveState } from './archive-types'
import { setupBackendTests } from './backend-test-hooks'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { START_JOB_KEY } from './start-storage'
import { expectSettled, outsideResumeJob } from './start-outside.test-support'

const fixtureForTest = setupBackendTests()

it('stops an archived sandbox after a held resume applies and retains it only after that stop', async () => {
  const fixture = fixtureForTest()
  const { actor, id, sandboxId } = await seededCompletedWorkspace(fixture)
  const endpoint = actor.endpoint()
  await endpoint.lifecycleStopped()
  fixture.boat.states.set(sandboxId, 'archived')
  expect(
    await endpoint.queueLifecycleStart(
      outsideResumeJob(fixture, id, sandboxId),
    ),
  ).toBe(true)
  const held = heldOperation()
  const order: string[] = []
  const stopPhases: (WorkspaceArchiveState['phase'] | undefined)[] = []
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    const stopping = new URL(request.url).pathname.endsWith('/stop')
    if (stopping) {
      stopPhases.push(
        (await actor.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY))
          ?.phase,
      )
      order.push('stop-requested')
    }
    const response = await fetch(request)
    if (stopping) order.push('stop-confirmed')
    return response
  }
  let retained = false
  await actor.native.configure({
    onPublication: async (event) => {
      actor.events.push(event)
    },
    hooks: {
      afterCommit: async (commit) => {
        if (retained || !commit.writes.includes(ARCHIVE_STATE_KEY)) return
        const state =
          await commit.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY)
        if (state?.phase !== 'retained') return
        retained = true
        order.push('retained')
      },
    },
  })
  fixture.boat.beforeResume = async () => {
    order.push('resume-held')
    await held.wait()
    order.push('resume-applied')
  }
  const advancing = actor.advance()
  const outcome = advancing.then(
    () => undefined,
    (error: unknown) => error,
  )
  let afterArchive: number
  try {
    await expectSettled(held.entered)
    const archived = await expectSettled(
      archiveActions(fixture, id, actor).archive(),
    )
    order.push('archived')
    expect(archived.workspace.state).toBe('archived')
    expect(await actor.storage.get(START_JOB_KEY)).toBeUndefined()
    expect(await endpoint.waitLifecycleStart()).toMatchObject({
      ok: false,
      error: { code: 'workspace_start_stopped' },
    })
    expect(
      await actor.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY),
    ).toMatchObject({ phase: 'stop', stoppedAt: null })
    expect(fixture.boat.stopIds).toEqual([])
    expect(fixture.boat.resumeIds).toEqual([])
    expect(order).toEqual(['resume-held', 'archived'])
    afterArchive = actor.events.length
  } finally {
    held.release()
    await outcome
  }
  expect(await outcome).toBeUndefined()
  expect(await actor.storage.get('alarm:lifecycle:start')).toBeUndefined()
  expect(fixture.boat.resumeIds).toEqual([sandboxId])
  expect(fixture.boat.stopIds).toEqual([sandboxId])
  expect(stopPhases).toEqual(['stop'])
  expect(order).toEqual([
    'resume-held',
    'archived',
    'resume-applied',
    'stop-requested',
    'stop-confirmed',
    'retained',
  ])
  expect(fixture.boat.states.get(sandboxId)).toBe('archived')
  expect(
    await actor.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY),
  ).toMatchObject({
    phase: 'retained',
    stoppedAt: fixture.runtime.dependencies.now(),
  })
  const archiveEvent = actor.events.findLastIndex(
    ({ event }) =>
      event.type === 'workspace.updated' &&
      event.workspace.state === 'archived',
  )
  expect(archiveEvent).toBeGreaterThanOrEqual(0)
  expect(
    actor.events.slice(archiveEvent + 1).map(({ event }) => event.type),
  ).not.toContain('start.updated')
  expect(
    actor.events.slice(afterArchive).map(({ event }) => event.type),
  ).not.toContain('start.updated')
})
