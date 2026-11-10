import { expect, it } from 'vitest'

import {
  existingWorkspace,
  joinedMember,
} from '../operator/suspension-test-support'
import { suspendOrg } from '../operator/suspend-org'
import { liftOrgSuspension } from '../operator/lift'
import { boatRoute } from '../sandbox/routes'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuildJob } from './build-data'
import {
  computerRecords,
  type ComputerRecord,
} from './computer-ledger.test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { createWorkspace } from './workspaces'
import { recordSandboxCleanup, retrySandboxCleanup } from './cleanup'

const fixtureForTest = setupBackendTests()

it('records the workspace owner before create and attaches one computer after a lost reply', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat, repositoryId } = fixture
  const sender = await joinedMember(fixture)
  const observed: ComputerRecord[][] = []
  const route = boatRoute({ operation: 'create' })
  const fetch = runtime.dependencies.fetch
  runtime.dependencies.fetch = async (request) => {
    if (
      request.method === route.method &&
      new URL(request.url).pathname.endsWith(route.path)
    )
      observed.push(await computerRecords(runtime.env.DB))
    return fetch(request)
  }
  boat.lostCreateReplies = 1
  const created = await fixture.run(() =>
    createWorkspace(
      runtime,
      org.id,
      user,
      {
        repositoryId,
        firstMessage: FIRST_MESSAGE,
      },
      sender,
    ),
  )
  const start = fixture.starts.get(created.workspace.id)
  if (!start) throw new Error('Missing start')
  const attempt = (await start.job())?.attempt
  await start.advance()
  expect(observed[0]).toEqual([
    {
      allocationKey: attempt,
      sandboxId: null,
      providerAccount: 'boat',
      orgId: org.id,
      ownerUserId: user.id,
      purpose: 'workspace',
      purposeId: created.workspace.id,
      cleanupPending: 0,
      deletedAt: null,
    },
  ])
  expect(await computerRecords(runtime.env.DB)).toEqual(observed[0])
  await start.restart()
  await start.advance()
  expect(await computerRecords(runtime.env.DB)).toEqual([
    {
      ...observed[0][0],
      sandboxId: 'bx_1',
    },
  ])
  expect(observed).toEqual([observed[0], observed[0]])
  expect(boat.states.size).toBe(1)
})

it('records the build starter before create and retains its deleted computer after cleanup', async () => {
  const fixture = fixtureForTest()
  const { images, org, user, boat, runtime } = fixture
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  const observed: ComputerRecord[][] = []
  const route = boatRoute({ operation: 'create' })
  const fetch = images.dependencies.fetch
  images.dependencies = {
    ...images.dependencies,
    fetch: async (request) => {
      if (
        request.method === route.method &&
        new URL(request.url).pathname.endsWith(route.path)
      )
        observed.push(await computerRecords(runtime.env.DB))
      return fetch(request)
    },
  }
  await advanceImageBuild(images, org.id, id)
  expect(observed).toEqual([
    [
      {
        allocationKey: `image-${id}`,
        sandboxId: null,
        providerAccount: 'boat',
        orgId: org.id,
        ownerUserId: user.id,
        purpose: 'build',
        purposeId: id,
        cleanupPending: 0,
        deletedAt: null,
      },
    ],
  ])
  await runtime.env.DB.prepare('UPDATE users SET suspended_at = 1 WHERE id = ?')
    .bind(user.id)
    .run()
  await advanceImageBuild(images, org.id, id)
  expect(boat.deletedIds).toEqual(['bx_1'])
  expect(await computerRecords(runtime.env.DB)).toEqual([
    {
      ...observed[0][0],
      sandboxId: 'bx_1',
      deletedAt: expect.any(Number),
    },
  ])
})

it('cleans every recorded failed computer after the workspace cleanup pointer changes', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, boat } = fixture
  const workspace = await existingWorkspace(fixture, 'cleanup-workspace')
  const absent = boatRoute({
    operation: 'delete',
    sandboxId: 'absent-computer',
  })
  const fetch = runtime.dependencies.fetch
  runtime.dependencies.fetch = async (request) =>
    request.method === absent.method &&
    new URL(request.url).pathname.endsWith(absent.path)
      ? Response.json({ ok: false, code: 'not_found' }, { status: 404 })
      : fetch(request)
  for (const sandboxId of [
    'older-computer',
    'later-computer',
    'absent-computer',
  ]) {
    boat.states.set(sandboxId, 'ready')
    await recordSandboxCleanup(runtime.env.DB, {
      workspaceId: workspace.id,
      orgId: org.id,
      sandboxId,
      providerAccount: 'boat',
    })
  }
  boat.deleteFailures = 1
  await expect(
    retrySandboxCleanup(runtime.env, runtime.dependencies, workspace.id),
  ).rejects.toMatchObject({ kind: 'unavailable' })
  expect(
    (await computerRecords(runtime.env.DB)).map((row) => row.deletedAt),
  ).toEqual([null, null, null, null])
  await expect(
    retrySandboxCleanup(runtime.env, runtime.dependencies, workspace.id),
  ).resolves.toBe(true)
  expect(boat.deletedIds).toEqual(['older-computer', 'later-computer'])
  expect(
    (await computerRecords(runtime.env.DB)).map((row) => ({
      sandboxId: row.sandboxId,
      cleanupPending: row.cleanupPending,
      deletedAt: row.deletedAt,
    })),
  ).toEqual([
    { sandboxId: 'bx_1', cleanupPending: 0, deletedAt: null },
    {
      sandboxId: 'older-computer',
      cleanupPending: 0,
      deletedAt: expect.any(Number),
    },
    {
      sandboxId: 'later-computer',
      cleanupPending: 0,
      deletedAt: expect.any(Number),
    },
    {
      sandboxId: 'absent-computer',
      cleanupPending: 0,
      deletedAt: expect.any(Number),
    },
  ])
  expect(boat.states.get('bx_1')).toBe('ready')
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS n FROM lifecycle_sandbox_cleanup',
    ).first('n'),
  ).toBe(0)
})

it('keeps no live computer after a definite first refusal and retains an uncertain allocation after a refused replay', async () => {
  const fixture = fixtureForTest()
  const { images, runtime, user, org, boat } = fixture
  const route = boatRoute({ operation: 'create' })
  const fetch = images.dependencies.fetch
  let refuse = true
  images.dependencies = {
    ...images.dependencies,
    fetch: (request) =>
      refuse &&
      request.method === route.method &&
      new URL(request.url).pathname.endsWith(route.path)
        ? Promise.resolve(
            Response.json({ ok: false, code: 'forbidden' }, { status: 403 }),
          )
        : fetch(request),
  }
  const begin = () =>
    startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
  const rejectedId = await begin()
  expect(await advanceImageBuild(images, org.id, rejectedId)).toBe(true)
  const allocation = (id: string) =>
    runtime.env.DB.prepare(
      'SELECT sandbox_id AS sandboxId, create_rejected AS createRejected FROM computer_ledger WHERE allocation_key = ?',
    )
      .bind(`image-${id}`)
      .first()
  expect(await allocation(rejectedId)).toEqual({
    sandboxId: null,
    createRejected: 1,
  })
  expect(await suspendOrg(runtime, org.id, user.id)).toMatchObject({
    pendingWorkspaceIds: [],
    pendingBuildIds: [],
  })
  await liftOrgSuspension(runtime, org.id, user.id)
  refuse = false
  boat.lostCreateReplies = 1
  const uncertainId = await begin()
  await advanceImageBuild(images, org.id, uncertainId)
  expect(await allocation(uncertainId)).toEqual({
    sandboxId: null,
    createRejected: 0,
  })
  // The saved job can predate the ledger, while its earlier provider reply was lost.
  await runtime.env.DB.prepare(
    'DELETE FROM computer_ledger WHERE allocation_key = ?',
  )
    .bind(`image-${uncertainId}`)
    .run()
  const retryAt = (await readBuildJob(runtime.env.DB, org.id, uncertainId))
    .providerRetry?.retryAt
  if (retryAt === null || retryAt === undefined)
    throw new Error('Missing retry')
  await fixture.setTime(retryAt)
  refuse = true
  await expect(
    advanceImageBuild(images, org.id, uncertainId),
  ).rejects.toMatchObject({ kind: 'forbidden' })
  expect(await allocation(uncertainId)).toEqual({
    sandboxId: null,
    createRejected: 0,
  })
  expect(boat.states.size).toBe(1)
})
