import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import {
  COMPUTER_STOP_TASK_KEY,
  computerStopObjectName,
  type ComputerStopTaskState,
} from '../lifecycle/computer-stop-task'
import { boatRoute } from '../sandbox/routes'
import { TEST_TIME } from '../test-support/harness'
import { liftOrgSuspension, liftUserSuspension } from './lift'
import { joinedMember } from './suspension-test-support'
import { suspendOrg } from './suspend-org'
import { suspendUser } from './suspend-user'

const fixtureForTest = setupBackendTests()

it('keeps both suspension scopes in one org task and retries after restart without another request', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat, harness, session } = fixture
  const otherOwner = await joinedMember(fixture)
  const outside = await harness.createOrg(session, 'Other org')
  for (const [id, orgId, owner] of [
    ['user-computer', org.id, user.id],
    ['org-computer', org.id, otherOwner.id],
    ['absent-computer', org.id, otherOwner.id],
    ['deleted-computer', org.id, otherOwner.id],
    ['outside-computer', outside.id, otherOwner.id],
  ]) {
    await runtime.env.DB.prepare(
      `INSERT INTO computer_ledger (sandbox_id, org_id, owner_user_id, purpose)
       VALUES (?, ?, ?, 'retained')`,
    )
      .bind(id, orgId, owner)
      .run()
    boat.states.set(id, 'ready')
  }
  const taskName = computerStopObjectName(org.id)
  const task = harness.native.actor(taskName)
  await task.ready
  const beforeDispatch: {
    state: ComputerStopTaskState | undefined
    alarm: number | null
  }[] = []
  const fetch = runtime.dependencies.fetch
  const stop = boatRoute({ operation: 'stop', sandboxId: 'user-computer' })
  runtime.dependencies.fetch = async (request) => {
    if (
      request.method === stop.method &&
      new URL(request.url).pathname.endsWith(stop.path)
    )
      beforeDispatch.push({
        state: await task.api.storage.get<ComputerStopTaskState>(
          COMPUTER_STOP_TASK_KEY,
        ),
        alarm: await task.api.storage.getAlarm(),
      })
    return fetch(request)
  }
  boat.failStop = true
  expect(await suspendUser(runtime, user.githubId, user.id)).toMatchObject({
    pendingWorkspaceIds: ['user-computer'],
    pendingBuildIds: [],
  })
  expect(beforeDispatch[0]).toEqual({
    state: {
      orgId: org.id,
      computers: [{ sandboxId: 'user-computer', providerAccount: 'boat' }],
    },
    alarm: TEST_TIME + 30_000,
  })
  expect(await suspendOrg(runtime, org.id, user.id)).toMatchObject({
    pendingWorkspaceIds: [
      'user-computer',
      'org-computer',
      'absent-computer',
      'deleted-computer',
    ],
    pendingBuildIds: [],
  })
  await runtime.env.DB.batch([
    runtime.env.DB.prepare(
      'UPDATE computer_ledger SET owner_user_id = ? WHERE sandbox_id = ?',
    ).bind(otherOwner.id, 'user-computer'),
    runtime.env.DB.prepare(
      'UPDATE computer_ledger SET deleted_at = ? WHERE sandbox_id = ?',
    ).bind(TEST_TIME, 'deleted-computer'),
  ])
  await liftUserSuspension(runtime, user.githubId, user.id)
  await liftOrgSuspension(runtime, org.id, user.id)
  await task.restart()
  boat.failStop = false
  boat.stopReplyState = 'running'
  const absent = boatRoute({ operation: 'get', sandboxId: 'absent-computer' })
  runtime.dependencies.fetch = async (request) =>
    new URL(request.url).pathname.includes(absent.path)
      ? Response.json({ ok: false, code: 'not_found' }, { status: 404 })
      : fetch(request)
  await fixture.advanceTo(TEST_TIME + 30_000, taskName)
  expect(
    await task.api.storage.get<ComputerStopTaskState>(COMPUTER_STOP_TASK_KEY),
  ).toEqual({
    orgId: org.id,
    computers: [
      { sandboxId: 'user-computer', providerAccount: 'boat' },
      { sandboxId: 'org-computer', providerAccount: 'boat' },
    ],
  })
  expect(await task.api.storage.getAlarm()).toBe(TEST_TIME + 60_000)
  await task.restart()
  boat.stopReplyState = 'archived'
  await fixture.advanceTo(TEST_TIME + 60_000, taskName)
  expect(boat.states.get('user-computer')).toBe('archived')
  expect(boat.states.get('org-computer')).toBe('archived')
  expect(boat.stopIds).toEqual([
    'user-computer',
    'user-computer',
    'org-computer',
    'absent-computer',
    'deleted-computer',
    'user-computer',
    'org-computer',
    'user-computer',
    'org-computer',
  ])
  expect(await task.api.storage.get(COMPUTER_STOP_TASK_KEY)).toBeUndefined()
  expect(await task.api.storage.getAlarm()).toBeNull()
  expect(boat.resumeIds).toEqual([])
  expect(boat.states.get('outside-computer')).toBe('ready')
})

it('fails suspension when detached Stop work cannot get a persistent owner', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat } = fixture
  await runtime.env.DB.prepare(
    `INSERT INTO computer_ledger (sandbox_id, org_id, owner_user_id, purpose)
     VALUES ('unowned-stop', ?, ?, 'retained')`,
  )
    .bind(org.id, user.id)
    .run()
  const namespace = runtime.env.WORKSPACES
  delete runtime.env.WORKSPACES
  try {
    await expect(
      suspendUser(runtime, user.githubId, user.id),
    ).rejects.toMatchObject({
      status: 503,
      code: 'workspaces_unavailable',
    })
  } finally {
    runtime.env.WORKSPACES = namespace
  }
  expect(boat.stopIds).toEqual([])
})
