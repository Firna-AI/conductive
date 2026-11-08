import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { DISK_KEEPALIVE_MS } from '../lifecycle/durable-types'
import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'
import { resumeWorkspace } from '../lifecycle/workspace-resume'
import { workspaceResponse } from '../lifecycle/workspace-response'
import { createWorkspace } from '../lifecycle/workspaces'
import { existingWorkspace, joinedMember } from './suspension-test-support'
import { suspendUser } from './suspend-user'

const backendFixture = setupBackendTests()

it('stops each owned computer, retries a failure, and blocks its owner from starting again', async () => {
  const fixture = backendFixture()
  const first = await existingWorkspace(fixture, 'first-owned')
  const second = await existingWorkspace(fixture, 'second-owned')
  const other = await joinedMember(fixture)
  const unaffected = await existingWorkspace(fixture, 'other-owned', other)
  const fetch = fixture.runtime.dependencies.fetch
  let refuse = true
  fixture.runtime.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/bx_1/stop') && refuse) {
      return Response.json({ ok: false, code: 'unavailable' }, { status: 503 })
    }
    return fetch(request)
  }
  const result = await suspendUser(
    fixture.runtime,
    fixture.user.githubId,
    fixture.user.id,
  )
  expect(result.pendingWorkspaceIds).toEqual([first.id])
  expect(
    (await fixture.runtime.workspace(second.id).readLifecycle())?.state,
  ).toBe('stopped')
  expect(fixture.boat.states.get('bx_3')).toBe('ready')
  expect(
    (await fixture.runtime.workspace(unaffected.id).readLifecycle())?.state,
  ).toBe('starting')
  await expect(
    createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      repositoryId: fixture.repositoryId,
      firstMessage: { ...FIRST_MESSAGE, id: 'suspended-create' },
    }),
  ).rejects.toMatchObject({ status: 403, code: 'user_suspended' })
  await expect(
    resumeWorkspace(fixture.runtime, fixture.org.id, second.id, other.id),
  ).rejects.toMatchObject({
    status: 403,
    code: 'user_suspended',
    message:
      'The workspace owner is suspended. Ask an admin to assign another member.',
  })
  await fixture.runtime.env.DB.prepare(
    "UPDATE workspaces SET state = 'archived', archived_at = ? WHERE id = ?",
  )
    .bind(fixture.runtime.dependencies.now(), second.id)
    .run()
  await expect(
    workspaceResponse(fixture.runtime, fixture.org.id, second.id),
  ).resolves.toMatchObject({ workspace: { state: 'archived' } })
  const firstActor = fixture.actors.get(first.id)
  if (!firstActor) throw new Error('Missing suspended actor')
  expect(firstActor.storage.alarmAt).not.toBeNull()
  refuse = false
  firstActor.restart()
  await firstActor.endpoint().alarm()
  expect((await firstActor.endpoint().readLifecycle())?.state).toBe('stopped')
  fixture.setTime(fixture.runtime.dependencies.now() + DISK_KEEPALIVE_MS)
  await firstActor.endpoint().alarm()
  expect(fixture.boat.resumeIds).toEqual([])
  expect(fixture.boat.starts).toHaveLength(3)
})

it('finishes suspension for a deleted org after its computer is already gone', async () => {
  const fixture = backendFixture()
  const workspace = await existingWorkspace(fixture, 'expired-computer')
  await fixture.runtime.env.DB.prepare(
    'UPDATE orgs SET deleted_at = ?, purge_after = ? WHERE id = ?',
  )
    .bind(
      fixture.runtime.dependencies.now(),
      fixture.runtime.dependencies.now() + 604800000,
      fixture.org.id,
    )
    .run()
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/sandboxes/bx_1/stop'))
      return Response.json({ ok: false, code: 'not_found' }, { status: 404 })
    if (
      request.method === 'GET' &&
      new URL(request.url).pathname.endsWith('/sandboxes/bx_1')
    )
      return Response.json({ ok: false, code: 'not_found' }, { status: 404 })
    return fetch(request)
  }
  const result = await suspendUser(
    fixture.runtime,
    fixture.user.githubId,
    fixture.user.id,
  )
  expect(result.pendingWorkspaceIds).toEqual([])
  expect(
    (await fixture.runtime.workspace(workspace.id).readLifecycle())?.state,
  ).toBe('stopped')
})
