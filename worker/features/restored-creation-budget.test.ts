import { afterEach, beforeAll, expect, it } from 'vitest'

import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import { workspacePaths } from '../../src/shared/workspaces'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record } from '../chat/inputs'
import { featureState } from './fixture.test-support'
import {
  admitRetainedCreation,
  advanceRetainedCreation,
  retainedCreationFixture,
  retainedCreationJob,
  type RetainedCreationFixture,
} from './retained-creation.test-support'

let bundle: string
let fixture: RetainedCreationFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/checkpoint-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('gives an allocated create opened after three retained days a fresh 20-minute budget without changing its allocation or creation date', async () => {
  const active = (fixture = await retainedCreationFixture(bundle))
  const { id } = await admitRetainedCreation(active)
  const original = await advanceRetainedCreation(active, id, 'ready')
  expect(original.deadlineAt).toBe(3_000_001_200_000)
  expect(
    (
      await active.request(deleteOrgPath(OUTER_ORG), {
        method: 'POST',
        body: JSON.stringify({ name: 'Chat org' }),
      })
    ).status,
  ).toBe(200)
  const openedAt = 3_000_259_200_000
  await active.actor(id).advanceTo(openedAt)
  expect(
    (
      await active.request(restoreOrgPath(OUTER_ORG), {
        method: 'POST',
        body: '{}',
      })
    ).status,
  ).toBe(200)
  expect(active.boat.resumeIds).toEqual([])
  const resumed = await active.request(workspacePaths.resume(OUTER_ORG, id), {
    method: 'POST',
    body: '{}',
  })
  expect(resumed.status).toBe(200)
  const summary = await active.actor(id).readChatWorkspaceSummary()
  expect(record(await resumed.json())).toMatchObject({
    eventNumber: summary.throughEventNumber,
    workspace: { id, state: 'starting' },
    start: { kind: 'create', startedAt: openedAt },
    error: null,
  })
  await active.actor(id).advanceTo(openedAt + 1_000)
  expect(
    featureState(await active.actor(id).inspectFeatureState()).get(
      'lifecycle:start-job',
    ),
  ).toMatchObject({
    kind: 'create',
    phase: 'ready',
    allocatedSandboxId: original.allocatedSandboxId,
  })
  const deadlineAt = 3_000_260_400_000
  expect(await retainedCreationJob(active, id)).toMatchObject({
    deadlineAt,
    attempt: original.attempt,
    imageName: original.imageName,
    createPayloadCiphertext: original.createPayloadCiphertext,
    admission: original.admission,
    creation: original.creation,
  })
  expect(
    await active.env.DB.prepare(
      'SELECT created_at AS createdAt, sandbox_id AS sandboxId FROM workspaces WHERE id = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({
    createdAt: 3_000_000_000_000,
    sandboxId: original.allocatedSandboxId,
  })
  active.boat.states.set('bx_1', 'provisioning')
  await active.actor(id).advanceTo(deadlineAt - 1)
  expect(await retainedCreationJob(active, id)).toMatchObject({
    phase: 'ready',
    deadlineAt,
    creation: { createdAt: 3_000_000_000_000 },
  })
  expect(await active.actor(id).readTestAlarm()).toBe(deadlineAt)
  expect(active.boat.deletedIds).toEqual([])
  await active.actor(id).advanceTo(deadlineAt)
  expect(
    featureState(await active.actor(id).inspectFeatureState()).get(
      'lifecycle:start-job',
    ),
  ).toBeUndefined()
  expect(await active.actor(id).waitCreationLifecycle()).toMatchObject({
    ok: false,
    error: {
      code: 'workspace_start_failed',
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
  expect(
    await active.env.DB.prepare('SELECT id FROM workspaces WHERE id = ?')
      .bind(id)
      .first(),
  ).toBeNull()
  expect(active.boat.starts).toHaveLength(1)
  expect(active.boat.resumeIds).toEqual([original.allocatedSandboxId])
  expect(active.boat.deletedIds).toEqual([original.allocatedSandboxId])
  expect(
    await active.actor(id).failedLifecycleCreation(OUTER_ORG, 'member'),
  ).toMatchObject({
    request: {
      id: 'allocated-create-message',
      text: 'Keep this after allocation',
    },
  })
})
