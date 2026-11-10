import type { AppEnv } from '../env'
import { isRecord } from '../http'
import { ProviderError } from '../sandbox/errors'
import type { SandboxProvider, SandboxStart } from '../sandbox/provider'
import { encrypt, decrypt } from '../security/crypto'
import { createResource } from './resource-intents'
import { assignSandbox } from './workspace-data'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'

function strings(value: unknown): Record<string, string> {
  if (!isRecord(value)) throw new Error('Invalid stored create values')
  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string')
      throw new Error('Invalid stored create value')
    result[key] = entry
  }
  return result
}

function createInput(value: unknown): SandboxStart {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    typeof value.ttlSeconds !== 'number' ||
    typeof value.idempotencyKey !== 'string' ||
    (value.snapshotName !== undefined && typeof value.snapshotName !== 'string')
  )
    throw new Error('Invalid stored create payload')
  return {
    name: value.name,
    snapshotName: value.snapshotName,
    ttlSeconds: value.ttlSeconds,
    idempotencyKey: value.idempotencyKey,
    env: strings(value.env),
    labels: strings(value.labels),
  }
}

function allocationContext(job: WorkspaceStartJob): string {
  return JSON.stringify([
    'workspace-create-payload',
    job.workspaceId,
    job.attempt,
  ])
}

export async function readWorkspaceAllocation(
  env: AppEnv,
  job: WorkspaceStartJob,
): Promise<SandboxStart> {
  if (!job.createPayloadCiphertext)
    throw new Error('Missing pinned allocation payload')
  return createInput(
    JSON.parse(
      await decrypt(
        job.createPayloadCiphertext,
        allocationContext(job),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    ),
  )
}

/** Pin the encrypted body before allocation. A lost reply replays the same body/key. */
export async function allocateWorkspace(
  env: AppEnv,
  provider: SandboxProvider,
  storage: StartJobStorage,
  job: WorkspaceStartJob,
  input: () => Promise<SandboxStart>,
): Promise<string | null> {
  const mayHaveAllocated = Boolean(job.createPayloadCiphertext)
  let payload: SandboxStart
  if (job.createPayloadCiphertext)
    payload = await readWorkspaceAllocation(env, job)
  else {
    payload = await input()
    job.createPayloadCiphertext = await encrypt(
      JSON.stringify(payload),
      allocationContext(job),
      env.BOAT_KEY_ENCRYPTION_KEY,
    )
  }
  try {
    if (!job.allocatedSandboxId) {
      const sandbox = await createResource(env.DB, provider, {
        kind: 'sandbox',
        mayHaveAllocated,
        ownership: {
          orgId: job.orgId,
          ownerUserId: job.creation?.user.id ?? payload.labels?.user ?? null,
          purpose: 'workspace',
          purposeId: job.workspaceId,
        },
        input: payload,
        persist: () => storage.update(job),
      })
      job.allocatedSandboxId = sandbox.id
      await assignSandbox(
        env.DB,
        job.orgId,
        job.workspaceId,
        sandbox.id,
        job.providerAccount,
      )
      await storage.update(job)
    }
    await assignSandbox(
      env.DB,
      job.orgId,
      job.workspaceId,
      job.allocatedSandboxId,
      job.providerAccount,
    )
    return job.allocatedSandboxId
  } catch (error) {
    if (
      error instanceof ProviderError &&
      !['unavailable', 'invalid_response', 'conflict', 'rate_limited'].includes(
        error.kind,
      )
    )
      throw error
    return null
  }
}
