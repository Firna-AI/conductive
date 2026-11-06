import { expect, it, vi } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { handleLifecycleRequest, type LifecycleBrowserOptions } from './browser'
import { workspacesPath } from '../../src/shared/workspaces'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'
import { resumeWorkspace } from './workspace-resume'

const fixtureForTest = setupBackendTests()

it('reserves one actor for simultaneous creates before any workspace row exists', async () => {
  const fixture = await fixtureForTest()
  const { runtime, org, user } = fixture
  const input = {
    repositoryId: fixture.repositoryId,
    firstMessage: FIRST_MESSAGE,
  }
  const original = runtime.workspace
  const ids: string[] = []
  let entered: () => void = () => {}
  const bothEntered = new Promise<void>((resolve) => {
    entered = resolve
  })
  runtime.workspace = (id) => {
    ids.push(id)
    if (ids.length === 2) entered()
    return original(id)
  }
  const queued = fixture.nextQueued()
  const first = createWorkspace(runtime, org.id, user, input)
  const duplicate = createWorkspace(runtime, org.id, user, input)
  void first.catch(() => {})
  void duplicate.catch(() => {})
  const id = await queued
  await bothEntered
  expect([...new Set(ids)]).toEqual([id])
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(0)
  const actor = fixture.starts.get(id)
  if (!actor) throw new Error('Missing reserved actor')
  for (let step = 0; step < 15 && (await actor.job()); step++)
    await actor.advance()
  const [created, repeated] = await Promise.all([first, duplicate])
  expect(created.workspace.id).toBe(id)
  expect(repeated.workspace.id).toBe(id)
  expect(fixture.boat.starts).toHaveLength(1)
})

it('joins concurrent pending creates and returns their real failure without accepting a message', async () => {
  const fixture = await fixtureForTest()
  const { runtime, org, user, repositoryId, boat } = fixture
  const input = { repositoryId, firstMessage: FIRST_MESSAGE }
  const context = { user, org, body: input, sessionId: 'signed-in-session' }
  const accept = vi.fn<LifecycleBrowserOptions['acceptFirstMessage']>()
  const options: LifecycleBrowserOptions = {
    software: SOFTWARE,
    acceptFirstMessage: accept,
    waitUntil: (promise) => {
      void promise.catch(() => {})
    },
  }
  const request = () =>
    new Request(`${runtime.env.APP_ORIGIN}${workspacesPath(org.id)}`, {
      method: 'POST',
    })
  const queued = fixture.nextQueued()
  const first = handleLifecycleRequest(
    request(),
    context,
    { ...runtime, images: fixture.images },
    options,
  )
  void first.catch(() => {})
  const id = await queued
  const actor = fixture.starts.get(id)
  const platform = fixture.actors.get(id)
  if (!actor || !platform) throw new Error('Missing claimed actor')
  await actor.advance()
  const held = platform.storage.holdRead('lifecycle:create-result')
  const duplicate = handleLifecycleRequest(
    request(),
    context,
    { ...runtime, images: fixture.images },
    options,
  )
  void duplicate.catch(() => {})
  const stage = await Promise.race([
    held.entered.then(() => 'joining'),
    duplicate.then(
      () => 'returned',
      () => 'returned',
    ),
  ])
  expect(stage).toBe('joining')
  expect(accept).toHaveBeenCalledTimes(0)
  boat.commandExitCode = 1
  for (let step = 0; step < 12 && (await actor.job()); step++)
    await actor.advance()
  held.release()
  const results = await Promise.allSettled([first, duplicate])
  expect(results).toEqual([
    {
      status: 'rejected',
      reason: expect.objectContaining({ code: 'workspace_start_failed' }),
    },
    {
      status: 'rejected',
      reason: expect.objectContaining({ code: 'workspace_start_failed' }),
    },
  ])
  expect(accept).toHaveBeenCalledTimes(0)
  expect(boat.starts).toHaveLength(1)
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(0)
  expect((await fixture.failedCreation(id))?.request).toEqual(FIRST_MESSAGE)
  boat.commandExitCode = 0
  const retried = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  expect(retried.workspace.id).not.toBe(id)
  expect(boat.starts).toHaveLength(2)
})

it('repairs a claim with no queued job and keeps successful retries independent of a later resume', async () => {
  const fixture = await fixtureForTest()
  const { runtime, org, user, repositoryId, boat } = fixture
  const input = { repositoryId, firstMessage: FIRST_MESSAGE }
  const original = runtime.workspace
  runtime.workspace = () => {
    throw new Error('handoff unavailable')
  }
  await expect(
    fixture.run(() => createWorkspace(runtime, org.id, user, input)),
  ).rejects.toThrow('handoff unavailable')
  const claim = await runtime.env.DB.prepare(
    "SELECT workspace_id AS id FROM workspace_creation_attempts WHERE state = 'pending'",
  ).first<{ id: string }>()
  if (!claim) throw new Error('Missing durable claim')
  runtime.workspace = original
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  expect(created.workspace.id).toBe(claim.id)
  const actor = fixture.actors.get(claim.id)?.endpoint()
  const control = fixture.starts.get(claim.id)
  if (!actor || !control) throw new Error('Missing repaired actor')
  boat.states.set('bx_1', 'archived')
  await actor.lifecycleStopped()
  const queued = fixture.nextQueued()
  // Consume the completed create's notification before observing the resume.
  expect(await queued).toBe(claim.id)
  const resume = resumeWorkspace(runtime, org.id, claim.id, user.id)
  void resume.catch(() => {})
  expect(await fixture.nextQueued()).toBe(claim.id)
  const duplicate = await createWorkspace(runtime, org.id, user, input)
  expect(duplicate.workspace.id).toBe(claim.id)
  expect(await control.job()).toMatchObject({ kind: 'resume' })
  expect(boat.starts).toHaveLength(1)
  boat.commandExitCode = 1
  for (let step = 0; step < 8 && (await control.job()); step++)
    await control.advance()
  await expect(resume).rejects.toMatchObject({ code: 'workspace_start_failed' })
  expect(
    (await createWorkspace(runtime, org.id, user, input)).workspace.id,
  ).toBe(claim.id)
})
