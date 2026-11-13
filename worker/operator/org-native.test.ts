import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { heldOperation } from '../test-support/held-operation'
import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'

import {
  realRuntimeFixture,
  runtimeBundle,
} from '../lifecycle/real-runtime-test-support'
import { runningRuntimeWorkspace } from '../lifecycle/runtime-lifecycle-test-support'
import {
  activeRuntimeOwner,
  queueRuntimeResume,
} from '../lifecycle/ownership-maintenance-test-support'
import { workspaceOwnerChangedHook } from '../lifecycle/ownership-maintenance'
import { resumeWorkspace } from '../lifecycle/workspace-resume'
import { removeOrgMember } from '../members/membership'
import { suspendOrg } from './suspend-org'
import { nativeSuspensionRuntime } from './native-runtime.test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => {
  await fixture.dispose()
})

it('retries an org stop after native restart and keeps the stop after a voluntary owner departure', async () => {
  const { workspaceId, sandboxId } = await runningRuntimeWorkspace(fixture)
  await activeRuntimeOwner(fixture)
  // Finish the restore watch, so that the alarm below is the stop retry.
  await fixture.actor(workspaceId).tick()
  const previousAlarm = await fixture.actor(workspaceId).alarmAt()
  fixture.boat.stopReplyState = 'running'
  const result = await suspendOrg(
    nativeSuspensionRuntime(fixture),
    'runtime-org',
    'active-admin',
  )
  expect(result.pendingWorkspaceIds).toEqual([workspaceId])
  expect(fixture.boat.stopIds).toEqual([sandboxId])
  expect(await fixture.actor(workspaceId).alarmAt()).not.toBeNull()
  expect(await fixture.actor(workspaceId).alarmAt()).not.toBe(previousAlarm)
  await removeOrgMember(
    fixture.env.DB,
    'runtime-org',
    'runtime-user',
    'runtime-user',
    Date.now(),
    {
      workspaceOwnerChanged: workspaceOwnerChangedHook(
        nativeSuspensionRuntime(fixture),
      ),
    },
  )
  await fixture.restart()
  fixture.boat.stopReplyState = 'archived'
  const actor = fixture.actor(workspaceId)
  await actor.tick()
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'stopped',
    runningSessions: [],
    runnerConnected: false,
  })
  expect(
    await fixture.env.DB.prepare(
      'SELECT owner_user_id FROM workspaces WHERE id = ?',
    )
      .bind(workspaceId)
      .first('owner_user_id'),
  ).toBe('active-admin')
  expect(await actor.alarmAt()).toBeNull()
  expect(fixture.boat.resumeIds).toEqual([])
})

it('suppresses a due native disk restart after org suspension while an active org still resumes', async () => {
  const { actor, workspaceId, sandboxId } =
    await runningRuntimeWorkspace(fixture)
  fixture.boat.states.set(sandboxId, 'archived')
  await actor.lifecycleStopped()
  await actor.makeDiskRetentionDue()
  await actor.tick()
  expect(fixture.boat.resumeIds).toEqual([sandboxId])
  await actor.tick()
  await actor.tick()
  await actor.tick()
  await suspendOrg(
    nativeSuspensionRuntime(fixture),
    'runtime-org',
    'runtime-user',
  )
  await actor.makeDiskRetentionDue()
  await fixture.restart()
  await fixture.actor(workspaceId).tick()
  expect(fixture.boat.resumeIds).toEqual([sandboxId])
  expect(await fixture.actor(workspaceId).readLifecycle()).toMatchObject({
    state: 'stopped',
  })
  expect(await fixture.actor(workspaceId).alarmAt()).toBeNull()
})

it('closes an idle native runner and refuses resumes while keeping chat history readable', async () => {
  const { actor, workspaceId, sandboxId } =
    await runningRuntimeWorkspace(fixture)
  const runner = await fixture.openRunner(workspaceId)
  runner.send({
    type: 'hello',
    protocolVersion: 2,
    workspaceId,
    streamId: 'org-idle',
  })
  expect(await runner.inbox.next()).toMatchObject({ type: 'welcome' })
  await suspendOrg(
    nativeSuspensionRuntime(fixture),
    'runtime-org',
    'runtime-user',
  )
  await actor.tickRunnerAccess()
  await expect.poll(() => runner.isClosed, { timeout: 10000 }).toBe(true)
  await runner.closed
  const browser = await fixture.openEvents(workspaceId)
  expect(await browser.inbox.next()).toMatchObject({ type: 'history' })
  await expect(
    resumeWorkspace(
      nativeSuspensionRuntime(fixture),
      'runtime-org',
      workspaceId,
      'runtime-user',
    ),
  ).rejects.toMatchObject({
    code: 'org_suspended',
  })
  expect(fixture.boat.resumeIds).toEqual([])
  expect(fixture.boat.states.get(sandboxId)).toBe('archived')
})

it('cancels a queued native resume before its next phase after runtime restart', async () => {
  const { actor, workspaceId, sandboxId } =
    await runningRuntimeWorkspace(fixture)
  fixture.boat.states.set(sandboxId, 'archived')
  await actor.lifecycleStopped()
  await queueRuntimeResume(fixture, workspaceId)
  await suspendOrg(
    nativeSuspensionRuntime(fixture),
    'runtime-org',
    'runtime-user',
  )
  await fixture.restart()
  await fixture.actor(workspaceId).tick()
  expect(await fixture.actor(workspaceId).waitLifecycleStart()).toMatchObject({
    ok: false,
  })
  expect(await fixture.actor(workspaceId).readLifecycle()).toMatchObject({
    state: 'stopped',
  })
  expect(fixture.boat.resumeIds).toEqual([])
})

it('cleans a native workspace allocation after its reply is lost during org suspension', async () => {
  const allocation = heldOperation()
  fixture.boat.lostCreateReplies = 1
  fixture.boat.afterLostCreate = allocation.wait
  let failure: string | null = null
  const creating = runningRuntimeWorkspace(fixture).catch((error: unknown) => {
    if (!(error instanceof Error)) throw error
    failure = error.message
  })
  await allocation.entered
  const suspended = suspendOrg(
    nativeSuspensionRuntime(fixture),
    'runtime-org',
    'runtime-user',
  )
  try {
    await expect
      .poll(
        async () =>
          (await fixture.actor('runtime-state-workspace').checkpoint())
            ?.cancelled,
        { timeout: 10000 },
      )
      .toBe(true)
    expect(await suspended).toMatchObject({
      pendingWorkspaceIds: ['runtime-state-workspace'],
    })
  } finally {
    allocation.release()
    await Promise.allSettled([creating, suspended])
  }
  expect(failure).toBe('Runtime create failed: org_suspended')
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(fixture.boat.states.size).toBe(0)
  expect(fixture.boat.starts).toHaveLength(2)
  expect(fixture.boat.starts[1]).toEqual(fixture.boat.starts[0])
  const browser = await fixture.openEvents('runtime-state-workspace')
  expect(browser.response.status).toBe(101)
  expect(await browser.inbox.next()).toMatchObject({
    type: 'history',
    history: {
      events: expect.arrayContaining([
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'message.accepted',
            message: expect.objectContaining({
              id: FIRST_MESSAGE.id,
              text: FIRST_MESSAGE.text,
            }),
          }),
        }),
      ]),
    },
  })
})
