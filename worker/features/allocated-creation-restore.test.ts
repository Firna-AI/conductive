import { afterEach, beforeAll, expect, it } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import { workspacePaths } from '../../src/shared/workspaces'
import { record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SOFTWARE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import {
  readRepositoryLocations,
  repositoryLocation,
} from '../lifecycle/repository-locations'
import { readWorkspaceToken, revokeWorkspaceToken } from '../lifecycle/tokens'
import { encrypt } from '../security/crypto'
import { featureFixture, type FeatureFixture } from './fixture.test-support'
import {
  admitRetainedCreation,
  advanceRetainedCreation,
  completeRetainedCreation,
  deleteAndRestoreCreation,
  retainedCreationJob,
  RETAINED_CONFIGURATION,
} from './retained-creation.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/checkpoint-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it.each(['ready', 'fetch'] as const)(
  'opens a restored allocated create at %s without losing its sandbox, message, or allocation pin',
  async (phase) => {
    const active = (fixture = await featureFixture(bundle, {
      configuration: RETAINED_CONFIGURATION,
    }))
    const { id, sessionId } = await admitRetainedCreation(active)
    const original = await advanceRetainedCreation(active, id, phase)
    const sandboxId = string(original.allocatedSandboxId)
    const commandsBefore = active.boat.commands.length
    await deleteAndRestoreCreation(active)
    expect(active.boat.stopIds).toContain(sandboxId)
    expect(active.boat.resumeIds).toEqual([])
    expect(active.boat.deletedIds).toEqual([])
    expect(
      await active.env.DB.prepare(
        'SELECT state, sandbox_id AS sandboxId FROM workspaces WHERE id = ?',
      )
        .bind(id)
        .first(),
    ).toEqual({ state: 'stopped', sandboxId })
    const environmentCiphertext = await encrypt(
      JSON.stringify({ RETAINED_ENV: 'current settings' }),
      orgEnvironmentContext(OUTER_ORG),
      active.env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await active.env.DB.batch([
      active.env.DB.prepare(
        'DELETE FROM image_leases WHERE workspace_id = ?',
      ).bind(id),
      active.env.DB.prepare(
        'UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?',
      ).bind(environmentCiphertext, OUTER_ORG),
    ])
    await revokeWorkspaceToken(active.env.DB, id, Date.now())
    const resumed = await active.request(workspacePaths.resume(OUTER_ORG, id), {
      method: 'POST',
      body: '{}',
    })
    expect(resumed.status).toBe(200)
    const continued = await retainedCreationJob(active, id)
    expect(continued).toMatchObject({
      kind: 'create',
      attempt: original.attempt,
      allocatedSandboxId: sandboxId,
      createPayloadCiphertext: original.createPayloadCiphertext,
      imageName: 'outer-image',
      turnId: original.turnId,
      admission: original.admission,
      creation: original.creation,
    })
    await advanceRetainedCreation(active, id, 'runner')
    expect(await active.actor(id).readLifecycle()).toMatchObject({
      state: 'starting',
      runnerConnected: false,
      pendingFirstMessage: null,
    })
    expect(
      await active.env.DB.prepare(
        'SELECT state, sandbox_id AS sandboxId FROM workspaces WHERE id = ?',
      )
        .bind(id)
        .first(),
    ).toEqual({ state: 'starting', sandboxId })
    expect(await completeRetainedCreation(active, id)).toEqual({ ok: true })
    expect(await active.actor(id).readLifecycle()).toMatchObject({
      startupPrepared: true,
      pendingFirstMessage: null,
    })
    expect(active.boat.resumeIds).toEqual([sandboxId])
    expect(active.boat.deletedIds).toEqual([])
    expect(active.boat.starts).toHaveLength(1)
    await expect(
      active.boat.server.requests
        .find((request) => new URL(request.url).pathname.endsWith('/resume'))
        ?.json(),
    ).resolves.toMatchObject({
      env: {
        WORKSPACE_TOKEN: await readWorkspaceToken(active.env, id),
        CONDUCTIVE_WORKSPACE_ID: id,
        CONDUCTIVE_DEFAULT_BRANCH: 'main',
        CONDUCTIVE_REPOSITORY_DIR: repositoryLocation(
          readRepositoryLocations(original.repositoryLocations),
          OUTER_REPOSITORY,
        ),
        RETAINED_ENV: 'current settings',
      },
    })
    expect(active.boat.commands.slice(commandsBefore)).toEqual([
      ...(phase === 'ready'
        ? [expect.stringContaining(OUTER_SOFTWARE.url)]
        : []),
      expect.stringContaining('git fetch origin'),
      expect.stringContaining('git checkout'),
      expect.stringContaining('/run/conductive/startup.sh'),
      expect.stringContaining('terminal'),
    ])
    const history = await active.request(
      chatHistoryPath(OUTER_ORG, id, sessionId),
    )
    expect(history.status).toBe(200)
    expect(record(await history.json()).events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'message.accepted',
            message: expect.objectContaining({
              id: 'allocated-create-message',
              text: 'Keep this after allocation',
              sender: expect.objectContaining({ id: 'member' }),
            }),
          }),
        }),
      ]),
    )
  },
)
