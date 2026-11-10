import { expect, it } from 'vitest'

import { requireFeatureResult } from '../features/result'
import { setupBackendTests } from './backend-test-hooks'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { readWorkspace } from './workspace-data'
import { TEST_TIME } from '../test-support/harness'
import { archiveFixture } from './archive-test-support'
import {
  authenticateWorkspaceToken,
  readWorkspaceToken,
  storeWorkspaceToken,
} from './tokens'
import { resumeCompletedWorkspace } from './completed-resume-test-support'
import { joinedMember } from '../operator/suspension-test-support'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import { heldOperation } from '../test-support/held-operation'
import { updateShellWorkspace } from '../app-api/feature-workspaces-data'
import { computerRecords } from './computer-ledger.test-support'

const fixtureForTest = setupBackendTests()

it('archives a stopped sandbox without a command or deletion and revokes its token', async () => {
  const fixture = fixtureForTest()
  const { id, actor, sandboxId } = await seededCompletedWorkspace(fixture)
  fixture.boat.states.set(sandboxId, 'archived')
  await actor.endpoint().lifecycleStopped()
  const commands = fixture.boat.commands.length
  fixture.boat.synchronousOutput = '\0' + '0\n'
  const response = requireFeatureResult(
    await actor.native.api.lifecycleRpc.archiveWorkspace(
      fixture.org.id,
      id,
      fixture.user.id,
      false,
      fixture.runtime.env.APP_ORIGIN,
    ),
  )
  expect(response.workspace.state).toBe('archived')
  expect(response.workspace.restoreUntil).toBe(TEST_TIME + 1_209_600_000)
  expect(fixture.boat.commands).toHaveLength(commands)
  expect(fixture.boat.deletedIds).toEqual([])
  expect(
    await readWorkspace(fixture.runtime.env.DB, fixture.org.id, id),
  ).toMatchObject({ sandboxId, state: 'archived' })
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT revoked_at FROM workspace_tokens WHERE workspace_id = ?',
    )
      .bind(id)
      .first('revoked_at'),
  ).toBe(fixture.runtime.dependencies.now())
})

it('stops a running sandbox and keeps the original stop request through reconstruction', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture)
  fixture.boat.stopReplyState = 'archiving'
  const archived = await saved.archive()
  expect(fixture.boat.stopIds).toEqual([saved.sandboxId])
  expect(archived.workspace.restoreUntil).toBe(
    archived.workspace.archivedAt! + WORKSPACE_RESTORE_MS,
  )
  await saved.actor.restart()
  fixture.boat.states.set(saved.sandboxId, 'archived')
  await fixture.advanceTo(TEST_TIME + 30_000, saved.id)
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT stopped_at FROM workspaces WHERE id = ?',
    )
      .bind(saved.id)
      .first('stopped_at'),
  ).toBe(archived.workspace.archivedAt)
  expect(fixture.boat.resumeIds).toEqual([])
  expect(await saved.actor.storage.get('alarm:lifecycle:archive')).toBe(
    archived.workspace.restoreUntil,
  )
})

it('restores without starting, orders same-time transitions, and resumes with a fresh token', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture)
  const before = await readWorkspaceToken(fixture.runtime.env, saved.id)
  const archived = await saved.archive()
  await storeWorkspaceToken(
    fixture.runtime.env,
    saved.id,
    'late-token',
    TEST_TIME,
  )
  await expect(
    authenticateWorkspaceToken(fixture.runtime.env, before),
  ).rejects.toMatchObject({ code: 'workspace_token_refused' })
  const restored = requireFeatureResult(await saved.restore())
  expect(restored.workspace).toMatchObject({
    id: saved.id,
    state: 'stopped',
    archivedAt: null,
    restoreUntil: null,
  })
  expect(restored.workspace.updatedAt).toBeGreaterThan(
    archived.workspace.updatedAt,
  )
  expect(fixture.boat.resumeIds).toEqual([])
  expect(requireFeatureResult(await saved.restore())).toEqual(restored)
  expect(await computerRecords(fixture.runtime.env.DB)).toMatchObject([
    {
      sandboxId: saved.sandboxId,
      providerAccount: 'boat',
      deletedAt: null,
      cleanupPending: 0,
    },
  ])
  await fixture.run(() =>
    resumeCompletedWorkspace(
      fixture.runtime,
      fixture.org.id,
      saved.id,
      fixture.user.id,
    ),
  )
  expect(await readWorkspaceToken(fixture.runtime.env, saved.id)).not.toBe(
    before,
  )
  expect(await readWorkspaceToken(fixture.runtime.env, saved.id)).not.toBe(
    'late-token',
  )
  await fixture.advanceTo(archived.workspace.restoreUntil!, saved.id)
  expect(fixture.boat.deletedIds).toEqual([])
})

it('allows another member to restore a suspended owner workspace without starting it', async () => {
  const fixture = fixtureForTest()
  const member = await joinedMember(fixture)
  const saved = await archiveFixture(fixture, true)
  await saved.archive()
  await fixture.runtime.env.DB.prepare(
    'UPDATE users SET suspended_at = ? WHERE id = ?',
  )
    .bind(TEST_TIME, fixture.user.id)
    .run()
  const response = await saved.restore(member.id)
  expect(response).toMatchObject({ ok: true })
  const restored = requireFeatureResult(response)
  expect(restored.workspace.state).toBe('stopped')
  expect(fixture.boat.resumeIds).toEqual([])
  expect(await saved.actor.storage.get('alarm:lifecycle')).toBeUndefined()
  await expect(
    resumeCompletedWorkspace(
      fixture.runtime,
      fixture.org.id,
      saved.id,
      member.id,
    ),
  ).rejects.toMatchObject({ code: 'user_suspended' })
})

it('rearchives in the same clock tick after interrupted Restore publication with a new archive owner', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture)
  const first = await saved.archive()
  let interrupted = false
  saved.actor.observePublication(async ({ event }) => {
    if (
      event.type === 'workspace.updated' &&
      event.workspace.state === 'stopped' &&
      !interrupted
    ) {
      interrupted = true
      throw new Error('Restore publication interrupted')
    }
  })
  await expect(saved.restore()).rejects.toThrow(
    'Restore publication interrupted',
  )
  const restored = await readWorkspace(
    fixture.runtime.env.DB,
    fixture.org.id,
    saved.id,
  )
  await updateShellWorkspace(fixture.runtime.env.DB, {
    orgId: fixture.org.id,
    userId: fixture.user.id,
    workspaceId: saved.id,
    name: 'Renamed after Restore',
    now: TEST_TIME,
  })
  const second = await saved.archive()
  expect(second.workspace.archivedAt).toBe(first.workspace.archivedAt)
  expect(second.workspace.updatedAt).toBeGreaterThan(restored.updatedAt)
  expect((await saved.actor.endpoint().readLifecycle())?.state).toBe('archived')
  expect(requireFeatureResult(await saved.restore()).workspace.state).toBe(
    'stopped',
  )
  expect(fixture.boat.deletedIds).toEqual([])
})

it('serializes a Restore request behind an expired sandbox deletion without reviving its disk', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture)
  const archived = await saved.archive()
  if (archived.workspace.restoreUntil === null)
    throw new Error('Missing deletion deadline')
  const held = heldOperation()
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    if (
      request.method === 'DELETE' &&
      new URL(request.url).pathname.endsWith(`/sandboxes/${saved.sandboxId}`)
    )
      await held.wait()
    return fetch(request)
  }
  const deleting = fixture.advanceTo(archived.workspace.restoreUntil, saved.id)
  await held.entered
  const restoring = saved.restore()
  held.release()
  await deleting
  expect(await restoring).toMatchObject({
    ok: false,
    error: { code: 'workspace_restore_unavailable' },
  })
  expect(
    await readWorkspace(fixture.runtime.env.DB, fixture.org.id, saved.id),
  ).toMatchObject({ sandboxId: null, state: 'archived' })
})

it('ends Restore exactly at expiry while deletion retries and publishes confirmed deletion', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture)
  const archived = await saved.archive()
  const expiresAt = archived.workspace.restoreUntil!
  fixture.boat.deleteFailures = 1
  await fixture.advanceTo(expiresAt, saved.id)
  expect(fixture.boat.deletedIds).toEqual([])
  expect(await saved.restore()).toMatchObject({
    ok: false,
    error: { status: 409, code: 'workspace_restore_unavailable' },
  })
  expect(await computerRecords(fixture.runtime.env.DB)).toMatchObject([
    {
      sandboxId: saved.sandboxId,
      providerAccount: 'boat',
      deletedAt: null,
      cleanupPending: 1,
    },
  ])
  expect(
    (await readWorkspace(fixture.runtime.env.DB, fixture.org.id, saved.id))
      .sandboxId,
  ).toBe(saved.sandboxId)
  await saved.actor.restart()
  await fixture.advanceTo(expiresAt + 30_000, saved.id)
  expect(fixture.boat.deletedIds).toEqual([saved.sandboxId])
  expect(await computerRecords(fixture.runtime.env.DB)).toMatchObject([
    {
      sandboxId: saved.sandboxId,
      providerAccount: 'boat',
      deletedAt: expiresAt + 30_000,
      cleanupPending: 0,
    },
  ])
  expect(await saved.restore()).toMatchObject({
    ok: false,
    error: { status: 409 },
  })
  expect(saved.actor.events.at(-1)?.event).toMatchObject({
    type: 'workspace.updated',
    workspace: { state: 'archived', restoreUntil: null },
  })
})
