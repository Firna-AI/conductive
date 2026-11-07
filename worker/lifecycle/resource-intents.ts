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

export interface SandboxResourceIntent {
  kind: 'sandbox'
  input: SandboxStart
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
  provider: SandboxProvider,
  intent: SandboxResourceIntent,
): Promise<Sandbox>
export function createResource(
  provider: SandboxProvider,
  intent: SnapshotResourceIntent,
): Promise<SavedSnapshot>
/** Persist the dispatched request's ownership before the provider can create it. */
export async function createResource(
  provider: SandboxProvider,
  intent: ResourceIntent,
): Promise<Sandbox | SavedSnapshot> {
  if (intent.kind === 'sandbox') {
    await intent.persist(intent.input)
    return provider.create(intent.input)
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
): SandboxResourceIntent {
  return {
    kind: 'sandbox',
    input: {
      snapshotName: job.previousImageName ?? undefined,
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
    // The durable build already pins the body. Its create phase records outstanding allocation.
    persist: () => updateBuildJob(db, job.buildId, 'create'),
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
      name: job.snapshotName ?? `image-${job.buildId}`,
    },
    persist: ({ name }) => assignBuildSnapshot(db, job.buildId, name),
  }
}
