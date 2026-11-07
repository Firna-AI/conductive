import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'
import { createWorkspace } from '../lifecycle/workspaces'
import { heldOperation } from '../lifecycle/platform-test-storage'
import { resumeWorkspace } from '../lifecycle/workspace-resume'
import { stopWorkspaceSandbox } from '../lifecycle/workspace-actions'
import { completedWorkspace, joinedMember } from './suspension-test-support'
import { suspendUser } from './suspend-user'

const backendFixture = setupBackendTests()

it('cancels an in-flight allocation and cleans its delayed computer after actor recovery', async () => {
  const fixture = backendFixture()
  const allocation = heldOperation()
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    const response = await fetch(request)
    if (
      request.method === 'POST' &&
      new URL(request.url).pathname.endsWith('/sandboxes')
    ) {
      await allocation.wait()
    }
    return response
  }
  const queued = fixture.nextQueued()
  const created = createWorkspace(
    fixture.runtime,
    fixture.org.id,
    fixture.user,
    {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    },
  )
  const id = await queued
  const actor = fixture.starts.get(id)
  if (!actor) throw new Error('Missing queued actor')
  await actor.advance()
  await created
  const advancing = actor.advance()
  await allocation.entered
  try {
    const suspended = await suspendUser(
      fixture.runtime,
      fixture.user.githubId,
      fixture.user.id,
    )
    expect(suspended.pendingWorkspaceIds).toEqual([id])
    expect(await actor.job()).toMatchObject({ cancelled: true })
  } finally {
    allocation.release()
    await advancing
  }
  expect(await actor.job()).toMatchObject({ cancelled: true })
  fixture.boat.deleteFailures = 1
  actor.restart()
  await actor.advance()
  expect(fixture.boat.starts).toHaveLength(1)
  actor.restart()
  await actor.advance()
  expect(fixture.boat.states.has('bx_1')).toBe(false)
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces WHERE id = ?',
    )
      .bind(id)
      .first('count'),
  ).toBe(0)
})

it('cancels a queued resume when its caller is suspended and its owner stays active', async () => {
  const fixture = backendFixture()
  const workspace = await completedWorkspace(fixture, 'owned-by-active-member')
  const member = await joinedMember(fixture)
  const endpoint = fixture.runtime.workspace(workspace.id)
  await stopWorkspaceSandbox({
    env: fixture.runtime.env,
    dependencies: fixture.runtime.dependencies,
    orgId: fixture.org.id,
    workspaceId: workspace.id,
  })
  await endpoint.lifecycleStopped()
  const queued = fixture.nextQueued()
  const resuming = resumeWorkspace(
    fixture.runtime,
    fixture.org.id,
    workspace.id,
    member.id,
  )
  void resuming.catch(() => {})
  await queued
  await suspendUser(fixture.runtime, member.githubId, fixture.user.id)
  const actor = fixture.starts.get(workspace.id)
  if (!actor) throw new Error('Missing resume actor')
  await actor.advance()
  await expect(resuming).rejects.toMatchObject({
    status: 403,
    code: 'user_suspended',
  })
  expect(fixture.boat.resumeIds).toEqual([])
  expect((await endpoint.readLifecycle())?.state).toBe('stopped')
})
