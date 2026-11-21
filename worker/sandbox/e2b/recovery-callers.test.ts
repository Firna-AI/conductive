import { expect, it } from 'vitest'

import type { AppDependencies } from '../../env'
import { seedBackend } from '../../lifecycle/backend-seed.test-support'
import { nativeWorkspaceStorage } from '../../lifecycle/platform-storage'
import { nextProviderRetry } from '../../lifecycle/provider-retry'
import {
  createResource,
  type SandboxResourceIntent,
} from '../../lifecycle/resource-intents'
import { readSavedScript } from '../../lifecycle/saved-script'
import {
  retryAllocationCleanup,
  START_ALLOCATION_CLEANUP_KEY,
} from '../../lifecycle/start-allocation-cleanup'
import { allocateWorkspace } from '../../lifecycle/start-allocation'
import {
  durableStartStorage,
  START_JOB_KEY,
} from '../../lifecycle/start-storage'
import { serializeStartJob } from '../../lifecycle/start-job-codec'
import type { WorkspaceStartJob } from '../../lifecycle/start-types'
import { TEST_TIME } from '../../test-support/harness'
import { E2bClient } from './client'
import { createInput, e2bFixture } from './client.test-support'

const fixture = e2bFixture()
let seeded: ReturnType<typeof seedBackend> | undefined

async function setup() {
  const value = fixture()
  const { org } = await (seeded ??= seedBackend(value.harness))
  const env = {
    ...value.harness.env,
    SANDBOX_PROVIDER_ACCOUNTS: JSON.stringify({
      [value.options.accountId]: {
        kind: 'e2b',
        apiKey: value.options.apiKey,
        domain: value.options.domain,
        templateId: value.options.templateId,
      },
    }),
  }
  const actor = value.harness.native.actor(`cleanup-${value.options.accountId}`)
  const storage = nativeWorkspaceStorage(actor.api.storage)
  const job: WorkspaceStartJob = {
    kind: 'create',
    phase: 'records',
    workspaceId: `workspace-${value.options.accountId}`,
    orgId: org.id,
    providerAccount: value.options.accountId,
    imageName: null,
    startupScript: readSavedScript(''),
    environmentCiphertext: null,
    defaultBranch: 'main',
    turnId: 'turn-one',
    attempt: createInput.idempotencyKey,
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  }
  await storage.put('job', START_JOB_KEY, serializeStartJob(job))
  return {
    ...value,
    org,
    env,
    storage,
    job,
    startStorage: durableStartStorage(storage, () => TEST_TIME, env),
  }
}

it('retries a certified no-allocation limit response through createResource and its provider retry window', async () => {
  const { client, server, env, org, options } = await setup()
  server.failure = {
    status: 429,
    code: 'sandbox_capacity_unavailable',
    retry: 3,
    shouldRetry: true,
  }
  const intent: SandboxResourceIntent = {
    kind: 'sandbox',
    input: createInput,
    ownership: {
      orgId: org.id,
      providerAccount: options.accountId,
      ownerUserId: null,
      purpose: 'workspace',
      purposeId: 'retry-workspace',
    },
    mayHaveAllocated: false,
    persist: async () => {},
  }
  const error: unknown = await createResource(env.DB, client, intent).catch(
    (failure: unknown) => failure,
  )
  expect(error).toMatchObject({ kind: 'rate_limited', retryAfterSeconds: 3 })
  expect(nextProviderRetry(null, error, TEST_TIME)?.retryAt).toBe(
    TEST_TIME + 3000,
  )
  expect(
    await env.DB.prepare(
      'SELECT create_rejected FROM computer_ledger WHERE provider_account = ?',
    )
      .bind(options.accountId)
      .first('create_rejected'),
  ).toBe(0)
  server.failure = null
  await expect(
    createResource(env.DB, client, { ...intent, mayHaveAllocated: true }),
  ).resolves.toEqual({ id: 'sandbox-one', state: 'ready' })
  expect(
    server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === '/v2/sandboxes',
    ),
  ).toHaveLength(2)
})

it('finishes actual allocation cleanup after a known no-resource limit refusal without another create', async () => {
  const { client, server, env, storage, job, startStorage, options } =
    await setup()
  server.failure = {
    status: 429,
    code: 'sandbox_capacity_unavailable',
    shouldRetry: true,
  }
  await expect(
    allocateWorkspace(env, client, startStorage, job, async () => createInput),
  ).resolves.toBeNull()
  server.failure = null
  await storage.put('job', START_ALLOCATION_CLEANUP_KEY, serializeStartJob(job))
  const dependencies: AppDependencies = {
    fetch: server.fetch,
    now: () => TEST_TIME,
    randomToken: () => 'unused',
  }
  await expect(
    retryAllocationCleanup(storage, env, dependencies),
  ).resolves.toBe(true)
  expect(await storage.get('job', START_ALLOCATION_CLEANUP_KEY)).toBeUndefined()
  expect(
    await env.DB.prepare(
      'SELECT create_rejected FROM computer_ledger WHERE provider_account = ?',
    )
      .bind(options.accountId)
      .first('create_rejected'),
  ).toBe(1)
  expect(
    server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === '/v2/sandboxes',
    ),
  ).toHaveLength(1)
  await expect(client.create(createInput)).rejects.toMatchObject({
    kind: 'not_found',
  })
})

it('recovers and deletes an unknown running allocation for a suspended org without connecting or bootstrapping', async () => {
  const { server, options, env, storage, job, startStorage, org } =
    await setup()
  let heldInventory = true
  const fetch = async (request: Request) => {
    if (
      heldInventory &&
      request.method === 'GET' &&
      new URL(request.url).pathname === '/v2/sandboxes'
    )
      throw new Error('lost inventory')
    return server.fetch(request)
  }
  const client = new E2bClient({ ...options, fetch })
  server.loseCreate = true
  await expect(
    allocateWorkspace(env, client, startStorage, job, async () => createInput),
  ).resolves.toBeNull()
  heldInventory = false
  await env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, org.id)
    .run()
  await storage.put('job', START_ALLOCATION_CLEANUP_KEY, serializeStartJob(job))
  const before = server.requests.length
  await expect(
    retryAllocationCleanup(storage, env, {
      fetch,
      now: () => TEST_TIME,
      randomToken: () => 'unused',
    }),
  ).resolves.toBe(true)
  expect(
    server.requests
      .slice(before)
      .some(
        (request) =>
          new URL(request.url).pathname.endsWith('/connect') ||
          new URL(request.url).pathname === '/process.Process/Start',
      ),
  ).toBe(false)
  expect(server.sandboxes.has('sandbox-one')).toBe(false)
})
