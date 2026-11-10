import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import type { NativeCommitView } from '../test-support/native-commit'
import { setupBackendTests } from './backend-test-hooks'
import { archiveActions, type ArchiveFixture } from './archive-test-support'
import { ARCHIVE_STATE_KEY, type WorkspaceArchiveState } from './archive-types'
import { computerRecords } from './computer-ledger.test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { readWorkspace } from './workspace-data'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

async function unresolvedArchive(fixture: ArchiveFixture) {
  fixture.boat.lostCreateReplies = Infinity
  const created = await fixture.run(() =>
    createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const start = fixture.starts.get(id)
  const actor = fixture.actors.get(id)
  if (!start || !actor) throw new Error('Missing uncertain creation')
  await start.advance()
  const job = await start.job()
  if (!job) throw new Error('Missing allocation request')
  const originalRequest = structuredClone(fixture.boat.starts[0])
  const archivedAt = TEST_TIME + 90_000
  await fixture.setTime(archivedAt)
  const actions = archiveActions(fixture, id, actor)
  const archived = await actions.archive()
  expect(archived.workspace.archivedAt).toBe(archivedAt)
  const saved =
    await actor.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY)
  const ciphertext = saved?.allocation?.createPayloadCiphertext
  if (!ciphertext) throw new Error('Missing encrypted archive request')
  return {
    id,
    actor,
    ciphertext,
    originalRequest,
    attempt: job.attempt,
    expiresAt: archivedAt + 1_209_600_000,
    ...actions,
    state: () => actor.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY),
    leases: () =>
      fixture.runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM image_leases WHERE workspace_id = ?',
      )
        .bind(id)
        .first<number>('count'),
  }
}

it('keeps an unresolved Archive request through its actual expiry and later deletes the recovered computer', async () => {
  const fixture = fixtureForTest()
  const saved = await unresolvedArchive(fixture)
  await fixture.advanceTo(saved.expiresAt - 60_000, saved.id)
  expect(await saved.state()).toMatchObject({
    phase: 'resolve',
    sandboxId: null,
    allocation: { createPayloadCiphertext: saved.ciphertext },
  })
  await fixture.advanceTo(saved.expiresAt, saved.id)
  expect(await saved.state()).toMatchObject({
    phase: 'resolve',
    sandboxId: null,
    allocation: { createPayloadCiphertext: saved.ciphertext },
  })
  expect(await saved.actor.storage.get('alarm:lifecycle:archive')).toBe(
    saved.expiresAt + 30_000,
  )
  expect(await saved.leases()).toBe(1)
  expect(fixture.boat.states.has('bx_1')).toBe(true)
  expect(fixture.boat.deletedIds).toEqual([])
  expect(await saved.restore()).toMatchObject({
    ok: false,
    error: { status: 409, code: 'workspace_restore_unavailable' },
  })
  await saved.actor.restart()
  fixture.boat.lostCreateReplies = 0
  await fixture.advanceTo(saved.expiresAt + 30_000, saved.id)
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(fixture.boat.states.has('bx_1')).toBe(false)
  expect(fixture.boat.starts).toEqual(
    Array.from(
      { length: fixture.boat.starts.length },
      () => saved.originalRequest,
    ),
  )
  expect(await computerRecords(fixture.runtime.env.DB)).toMatchObject([
    {
      allocationKey: saved.attempt,
      sandboxId: 'bx_1',
      providerAccount: 'boat',
      cleanupPending: 0,
      deletedAt: saved.expiresAt + 30_000,
    },
  ])
  expect(await saved.leases()).toBe(0)
  expect((await saved.state())?.allocation).toBeUndefined()
  expect(
    await saved.actor.storage.get('alarm:lifecycle:archive'),
  ).toBeUndefined()
  expect(await saved.restore()).toMatchObject({
    ok: false,
    error: { status: 409 },
  })
})

it('keeps the recovered Archive ID and request across interruption before its D1 write and expiry', async () => {
  const fixture = fixtureForTest()
  const saved = await unresolvedArchive(fixture)
  fixture.boat.lostCreateReplies = 0
  let interrupted = false
  await saved.actor.native.configure({
    hooks: {
      afterCommit: async (commit: NativeCommitView) => {
        if (interrupted || !commit.writes.includes(ARCHIVE_STATE_KEY)) return
        const state =
          await commit.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY)
        if (state?.sandboxId !== 'bx_1' || state.phase !== 'stop') return
        interrupted = true
        throw new Error('Recovered identity interrupted before D1')
      },
    },
  })
  await fixture.advanceTo(saved.expiresAt - 1, saved.id)
  expect(interrupted).toBe(true)
  expect(
    (await readWorkspace(fixture.runtime.env.DB, fixture.org.id, saved.id))
      .sandboxId,
  ).toBeNull()
  expect(await saved.state()).toMatchObject({
    sandboxId: 'bx_1',
    allocation: { createPayloadCiphertext: saved.ciphertext },
  })
  expect(await saved.leases()).toBe(1)
  const creates = fixture.boat.starts.length
  await saved.actor.native.configure({})
  await saved.actor.restart()
  await fixture.advanceTo(saved.expiresAt + 30_000, saved.id)
  expect(fixture.boat.starts).toHaveLength(creates)
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(await computerRecords(fixture.runtime.env.DB)).toMatchObject([
    {
      allocationKey: saved.attempt,
      sandboxId: 'bx_1',
      providerAccount: 'boat',
      cleanupPending: 0,
      deletedAt: saved.expiresAt + 30_000,
    },
  ])
  expect(await saved.leases()).toBe(0)
  expect((await saved.state())?.allocation).toBeUndefined()
  expect(
    await saved.actor.storage.get('alarm:lifecycle:archive'),
  ).toBeUndefined()
  expect(await saved.restore()).toMatchObject({
    ok: false,
    error: { status: 409 },
  })
})
