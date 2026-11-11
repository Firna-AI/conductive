import { savedImageName } from './image-names'
import type {
  Sandbox,
  SandboxProvider,
  SandboxStart,
  SavedSnapshot,
} from '../sandbox/provider'
import { ProviderError } from '../sandbox/errors'
import {
  assignBuildSnapshot,
  updateBuildJob,
  type BuildJob,
} from './build-data'
import {
  capturedRepositoryLocations,
  repositoryEnvironment,
} from './repository-locations'
import { readRepositories } from './settings-data'
import {
  attachComputer,
  recordComputerIntent,
  rejectComputerIntent,
  type ComputerOwnership,
} from './computer-ledger'

export interface SandboxResourceIntent {
  kind: 'sandbox'
  input: SandboxStart
  /** Null only for a computer that no org owns. Its own record keeps it. */
  ownership: ComputerOwnership | null
  mayHaveAllocated: boolean
  persist(input: SandboxStart): Promise<void>
}

interface SnapshotInput {
  sandboxId: string
  name: string
}

export interface SnapshotResourceIntent {
  kind: 'snapshot'
  recorded: boolean
  input: SnapshotInput
  persist(input: SnapshotInput): Promise<void>
}

export type ResourceIntent = SandboxResourceIntent | SnapshotResourceIntent

export function createResource(
  db: D1Database,
  provider: SandboxProvider,
  intent: SandboxResourceIntent,
): Promise<Sandbox>
export function createResource(
  db: D1Database,
  provider: SandboxProvider,
  intent: SnapshotResourceIntent,
): Promise<SavedSnapshot>
/** Persist the dispatched request's ownership before the provider can create it. */
export async function createResource(
  db: D1Database,
  provider: SandboxProvider,
  intent: ResourceIntent,
): Promise<Sandbox | SavedSnapshot> {
  if (intent.kind === 'sandbox') {
    await intent.persist(intent.input)
    const ownership = intent.ownership
    if (!ownership) return provider.create(intent.input)
    const firstDispatch = await recordComputerIntent(
      db,
      intent.input.idempotencyKey,
      ownership,
      intent.mayHaveAllocated,
    )
    let sandbox: Sandbox
    try {
      sandbox = await provider.create(intent.input)
    } catch (error) {
      if (
        firstDispatch &&
        error instanceof ProviderError &&
        [
          'unauthorized',
          'forbidden',
          'payment_required',
          'not_found',
          'invalid_request',
        ].includes(error.kind)
      )
        await rejectComputerIntent(
          db,
          intent.input.idempotencyKey,
          ownership.providerAccount,
        )
      throw error
    }
    await attachComputer(db, intent.input.idempotencyKey, sandbox.id, ownership)
    return sandbox
  }
  if (intent.recorded) {
    try {
      return await provider.getSnapshot(intent.input.name)
    } catch (error) {
      if (!(error instanceof ProviderError && error.kind === 'not_found'))
        throw error
    }
  }
  await intent.persist(intent.input)
  try {
    return await provider.saveSnapshot(
      intent.input.sandboxId,
      intent.input.name,
    )
  } catch (error) {
    if (
      error instanceof ProviderError &&
      error.kind === 'conflict' &&
      error.status === 409 &&
      error.providerCode === 'save_in_progress'
    )
      return {
        name: intent.input.name,
        sourceSandboxId: intent.input.sandboxId,
        status: 'saving',
      }
    throw error
  }
}

export function buildSandboxIntent(
  db: D1Database,
  job: BuildJob,
  mayHaveAllocated: boolean,
): SandboxResourceIntent {
  return {
    kind: 'sandbox',
    mayHaveAllocated,
    ownership: {
      orgId: job.orgId,
      providerAccount: job.providerAccount,
      ownerUserId: job.startedByUserId,
      purpose: 'build',
      purposeId: job.buildId,
    },
    input: {
      snapshotName: job.softwareImageName ?? undefined,
      name: `image-${job.buildId}`,
      env: repositoryEnvironment(
        capturedRepositoryLocations(
          job.repositoryLocationsJson,
          readRepositories(JSON.parse(job.repositoriesJson)),
        ),
      ),
      ttlSeconds: 1_800,
      idempotencyKey: `image-${job.buildId}`,
      labels: { org: job.orgId, build: job.buildId },
    },
    // The durable build pins the body. Preserve a recorded allocation before replay.
    persist: () =>
      updateBuildJob(
        db,
        job.buildId,
        job.phase === 'allocating' ? 'allocating' : 'create',
      ),
  }
}

export function buildSnapshotIntent(
  db: D1Database,
  job: BuildJob,
): SnapshotResourceIntent {
  if (!job.sandboxId) throw new Error('Missing build sandbox')
  return {
    kind: 'snapshot',
    recorded: job.snapshotName !== null,
    input: {
      sandboxId: job.sandboxId,
      name: job.snapshotName ?? savedImageName(job.buildId),
    },
    persist: ({ name }) =>
      assignBuildSnapshot(db, job.buildId, name, job.providerAccount),
  }
}
