import { expect, it } from 'vitest'

import { E2bClient } from '../sandbox/e2b/client'
import { FakeE2b } from '../test-support/fake-e2b'
import { TEST_TIME } from '../test-support/harness'
import { recoverArchivedAllocation } from './archive-allocation'
import { ARCHIVE_STATE_KEY, type WorkspaceArchiveState } from './archive-types'
import { setupBackendTests } from './backend-test-hooks'
import { nativeWorkspaceStorage } from './platform-storage'
import { readSavedScript } from './saved-script'
import { allocateWorkspace } from './start-allocation'
import { serializeStartJob } from './start-job-codec'
import { durableStartStorage, START_JOB_KEY } from './start-storage'
import type { WorkspaceStartJob } from './start-types'

const fixtureForTest = setupBackendTests()

it.each(['uncertain', 'absent'] as const)(
  'resolves an %s archived E2B allocation without connecting or creating another computer',
  async (scenario) => {
    const fixture = fixtureForTest()
    const { runtime, org } = fixture
    const server = new FakeE2b()
    let holdInventory = true
    const fetch = (request: Request) => {
      if (
        holdInventory &&
        request.method === 'GET' &&
        new URL(request.url).pathname === '/v2/sandboxes'
      )
        throw new Error('Inventory temporarily unavailable')
      return server.fetch(request)
    }
    runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
      e2b: {
        kind: 'e2b',
        apiKey: server.apiKey,
        domain: server.domain,
        templateId: 'e2b-template',
      },
    })
    const client = new E2bClient({
      accountId: 'e2b',
      apiKey: server.apiKey,
      domain: server.domain,
      templateId: 'e2b-template',
      db: runtime.env.DB,
      encryptionKey: runtime.env.BOAT_KEY_ENCRYPTION_KEY,
      fetch,
    })
    const actor = fixture.harness.native.actor('archive-allocation-check')
    const storage = nativeWorkspaceStorage(actor.api.storage)
    const job: WorkspaceStartJob = {
      kind: 'create',
      phase: 'records',
      workspaceId: 'archived-allocation',
      orgId: org.id,
      providerAccount: 'e2b',
      imageName: null,
      startupScript: readSavedScript(''),
      environmentCiphertext: null,
      defaultBranch: 'main',
      turnId: 'archive-turn',
      attempt: 'archive-allocation-request',
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
    }
    await storage.put('job', START_JOB_KEY, serializeStartJob(job))
    if (scenario === 'uncertain') server.loseCreate = true
    else
      server.failure = {
        status: 429,
        code: 'sandbox_capacity_unavailable',
        shouldRetry: true,
      }
    await expect(
      allocateWorkspace(
        runtime.env,
        client,
        durableStartStorage(storage, runtime.dependencies.now, runtime.env),
        job,
        async () => ({
          name: job.workspaceId,
          ttlSeconds: 1800,
          idempotencyKey: job.attempt,
          env: {},
          labels: { org: org.id },
        }),
      ),
    ).resolves.toBeNull()
    holdInventory = false
    server.failure = null
    const before = server.requests.length
    const state: WorkspaceArchiveState = {
      workspaceId: job.workspaceId,
      orgId: org.id,
      providerAccount: 'e2b',
      revision: 0,
      archivedAt: TEST_TIME,
      sandboxId: null,
      stoppedAt: null,
      phase: 'resolve',
      allocation: serializeStartJob(job),
    }
    const result = await recoverArchivedAllocation(
      { env: runtime.env, dependencies: { ...runtime.dependencies, fetch } },
      state,
      (next) => storage.put('archive', ARCHIVE_STATE_KEY, next),
    )
    expect(result).toMatchObject(
      scenario === 'uncertain'
        ? { phase: 'stop', sandboxId: 'sandbox-one', providerAccount: 'e2b' }
        : { phase: 'retained', sandboxId: null, allocation: undefined },
    )
    expect(
      server.requests
        .slice(before)
        .filter((request) => request.method === 'POST'),
    ).toEqual([])
    expect(await storage.get('archive', ARCHIVE_STATE_KEY)).toEqual(result)
    expect(
      await runtime.env.DB.prepare(
        'SELECT create_rejected AS rejected, sandbox_id AS sandboxId FROM computer_ledger WHERE allocation_key = ? AND provider_account = ?',
      )
        .bind(job.attempt, 'e2b')
        .first(),
    ).toEqual(
      scenario === 'uncertain'
        ? { rejected: 0, sandboxId: 'sandbox-one' }
        : { rejected: 1, sandboxId: null },
    )
  },
)
