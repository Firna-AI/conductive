import { expect, it } from 'vitest'

import { heldOperation } from '../test-support/held-operation'
import { archiveActions } from './archive-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { START_JOB_KEY } from './start-storage'
import { expectSettled, outsideResumeJob } from './start-outside.test-support'
import { readWorkspace } from './workspace-data'

const fixtureForTest = setupBackendTests()

it.each([
  {
    name: 'Archive then Restore',
    repeatArchive: false,
    order: [
      'resume-held',
      'archived',
      'restored',
      'held-resume-applied',
      'stop-requested',
      'stop-confirmed',
    ],
  },
  {
    name: 'Archive twice then Restore',
    repeatArchive: true,
    order: [
      'resume-held',
      'archived',
      'archived-again',
      'restored',
      'held-resume-applied',
      'stop-requested',
      'stop-confirmed',
    ],
  },
])('$name stops the held resume without another resume', async (scenario) => {
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
  const actions = archiveActions(fixture, id, actor)
  const held = heldOperation()
  const order: string[] = []
  let firstResume = true
  fixture.boat.beforeResume = async () => {
    if (!firstResume) {
      order.push('extra-resume')
      return
    }
    firstResume = false
    order.push('resume-held')
    await held.wait()
    order.push('held-resume-applied')
  }
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    const stopping = new URL(request.url).pathname.endsWith('/stop')
    if (stopping) order.push('stop-requested')
    const response = await fetch(request)
    if (stopping) order.push('stop-confirmed')
    return response
  }
  const advancing = actor.advance()
  const outcome = advancing.then(
    () => undefined,
    (error: unknown) => error,
  )
  let afterArchive: number
  try {
    await expectSettled(held.entered)
    const archived = await expectSettled(actions.archive())
    order.push('archived')
    expect(archived.workspace.state).toBe('archived')
    afterArchive = actor.events.length
    if (scenario.repeatArchive) {
      await expectSettled(actions.archive())
      order.push('archived-again')
    }
    expect(await expectSettled(actions.restore())).toMatchObject({
      ok: true,
      value: { workspace: { state: 'stopped', archivedAt: null } },
    })
    order.push('restored')
    expect(await actor.storage.get(START_JOB_KEY)).toBeUndefined()
    expect(await endpoint.readLifecycle()).toMatchObject({
      state: 'stopped',
      startStop: 'pending',
    })
  } finally {
    held.release()
    await outcome
  }
  expect(await outcome).toBeUndefined()
  await fixture.advanceTo(fixture.runtime.dependencies.now() + 1_000, id)
  expect(fixture.boat.states.get(sandboxId)).toBe('archived')
  expect(fixture.boat.resumeIds).toEqual([sandboxId])
  expect(fixture.boat.stopIds).toEqual([sandboxId])
  expect(order).toEqual(scenario.order)
  expect(await endpoint.readLifecycle()).toMatchObject({
    state: 'stopped',
    start: null,
    startStop: 'stopped',
  })
  expect(
    await readWorkspace(fixture.runtime.env.DB, fixture.org.id, id),
  ).toMatchObject({ state: 'stopped', sandboxId, archivedAt: null })
  expect(
    actor.events.slice(afterArchive).map(({ event }) => event.type),
  ).not.toContain('start.updated')
})
