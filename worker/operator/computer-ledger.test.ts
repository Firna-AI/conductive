import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { recordSandboxCleanup } from '../lifecycle/cleanup'
import { computerRecords } from '../lifecycle/computer-ledger.test-support'
import { membersClient } from '../members/members-test-support'
import { reassignWorkspace } from '../members/ownership'
import { boatRoute } from '../sandbox/routes'
import { existingWorkspace, joinedMember } from './suspension-test-support'
import { suspendOrg } from './suspend-org'
import { suspendUser } from './suspend-user'

const fixtureForTest = setupBackendTests()

it('uses the current owner and stops recorded computers after their workspace is removed', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat, harness } = fixture
  const nextOwner = await joinedMember(fixture)
  const workspace = await existingWorkspace(fixture, 'removed-workspace')
  boat.states.set('detached-computer', 'ready')
  await recordSandboxCleanup(runtime.env.DB, {
    workspaceId: workspace.id,
    orgId: org.id,
    sandboxId: 'detached-computer',
  })
  await reassignWorkspace(
    runtime.env.DB,
    org.id,
    user.id,
    workspace.id,
    nextOwner.id,
    runtime.dependencies.now(),
    membersClient(harness).hooks,
  )
  await runtime.env.DB.prepare('DELETE FROM workspaces WHERE id = ?')
    .bind(workspace.id)
    .run()
  expect(
    (await computerRecords(runtime.env.DB)).map((row) => row.ownerUserId),
  ).toEqual([nextOwner.id, nextOwner.id])
  expect(await suspendUser(runtime, user.githubId, user.id)).toMatchObject({
    pendingWorkspaceIds: [],
  })
  expect(boat.stopIds).toEqual([])
  expect(await suspendUser(runtime, nextOwner.githubId, user.id)).toMatchObject(
    {
      pendingWorkspaceIds: [workspace.id],
      pendingBuildIds: [],
    },
  )
  expect(boat.stopIds).toEqual(['bx_1', 'detached-computer'])
  expect([...boat.states.values()]).toEqual(['archived', 'archived'])
})

it('stops only live org ledger computers and reports an unknown legacy computer until its stop is confirmed', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat, harness, session } = fixture
  const other = await harness.createOrg(session, 'Other org')
  for (const [sandboxId, orgId, deletedAt] of [
    ['retained-computer', org.id, null],
    ['absent-computer', org.id, null],
    ['deleted-computer', org.id, 1],
    ['outside-computer', other.id, null],
  ] as const)
    await runtime.env.DB.prepare(
      `INSERT INTO computer_ledger (sandbox_id, org_id, purpose, deleted_at)
      VALUES (?, ?, 'retained', ?)`,
    )
      .bind(sandboxId, orgId, deletedAt)
      .run()
  const fetch = runtime.dependencies.fetch
  const absent = boatRoute({ operation: 'get', sandboxId: 'absent-computer' })
  runtime.dependencies.fetch = async (request) =>
    new URL(request.url).pathname.includes(absent.path)
      ? Response.json({ ok: false, code: 'not_found' }, { status: 404 })
      : fetch(request)
  boat.states.set('retained-computer', 'ready')
  boat.failStop = true
  expect(await suspendOrg(runtime, org.id, user.id)).toMatchObject({
    pendingWorkspaceIds: ['retained-computer'],
    pendingBuildIds: [],
  })
  expect(boat.stopIds).toEqual(['retained-computer'])
  boat.failStop = false
  expect(await suspendOrg(runtime, org.id, user.id)).toMatchObject({
    pendingWorkspaceIds: [],
    pendingBuildIds: [],
  })
  expect(boat.states.get('retained-computer')).toBe('archived')
  expect(boat.stopIds).toEqual(['retained-computer', 'retained-computer'])
})
