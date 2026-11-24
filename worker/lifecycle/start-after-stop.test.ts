import { expect, it } from 'vitest'

import { archiveActions } from './archive-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { START_JOB_KEY } from './start-storage'
import { outsideResumeJob } from './start-outside.test-support'

const fixtureForTest = setupBackendTests()

/** A running workspace that Archive stops and Restore brings back before its stop ends. */
async function restoredDuringStop() {
  const fixture = fixtureForTest()
  const saved = await seededCompletedWorkspace(fixture)
  const actions = archiveActions(fixture, saved.id, saved.actor)
  fixture.boat.stopReplyState = 'archiving'
  await actions.archive()
  expect(await actions.restore()).toMatchObject({
    ok: true,
    value: { workspace: { state: 'stopped', archivedAt: null } },
  })
  const endpoint = saved.actor.endpoint()
  expect(await endpoint.readLifecycle()).toMatchObject({
    state: 'stopped',
    startStop: 'pending',
  })
  const resume = outsideResumeJob(fixture, saved.id, saved.sandboxId)
  const finishStop = async () => {
    fixture.boat.stopReplyState = 'archived'
    fixture.boat.states.set(saved.sandboxId, 'archived')
    await fixture.advanceTo(
      fixture.runtime.dependencies.now() + 5_000,
      saved.id,
    )
  }
  return { ...saved, fixture, actions, endpoint, resume, finishStop }
}

it('starts a resume that came during the stop when that stop ends', async () => {
  const { fixture, actor, endpoint, resume, sandboxId, finishStop } =
    await restoredDuringStop()

  expect(await endpoint.queueLifecycleStart(resume)).toBe(false)
  expect(await actor.storage.get(START_JOB_KEY)).toBeUndefined()
  expect(fixture.boat.resumeIds).toEqual([])

  await finishStop()

  expect(fixture.boat.resumeIds).toEqual([sandboxId])
  expect(await endpoint.readLifecycle()).toMatchObject({
    start: { kind: 'resume' },
    startStop: undefined,
  })
})

it('drops the held resume when an Archive comes before the stop ends', async () => {
  const { fixture, endpoint, actions, resume, finishStop } =
    await restoredDuringStop()

  expect(await endpoint.queueLifecycleStart(resume)).toBe(false)
  await actions.archive()
  await actions.restore()
  await finishStop()

  expect(fixture.boat.resumeIds).toEqual([])
  expect(await endpoint.readLifecycle()).toMatchObject({
    state: 'stopped',
    start: null,
  })
})

it('drops a held resume that waited longer than the start time limit', async () => {
  const { fixture, endpoint, resume, finishStop } = await restoredDuringStop()

  expect(await endpoint.queueLifecycleStart(resume)).toBe(false)
  await fixture.advanceTo(fixture.runtime.dependencies.now() + 21 * 60_000)
  await finishStop()

  expect(fixture.boat.resumeIds).toEqual([])
})
