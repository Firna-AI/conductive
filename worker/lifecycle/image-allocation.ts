import type { SandboxProvider } from '../sandbox/provider'
import { assignBuildSandbox, type BuildJob } from './build-data'
import { completeBuildPhase } from './build-phase-data'
import { buildSandboxIntent, createResource } from './resource-intents'
import { recoverResourceForCleanup } from './allocation-recovery'

export async function allocateImageBuild(
  db: D1Database,
  provider: SandboxProvider,
  job: BuildJob,
  mayHaveAllocated: boolean,
): Promise<void> {
  await recoverImageBuildAllocation(db, provider, job, mayHaveAllocated)
  await completeBuildPhase(db, job.buildId, 'sources')
}

export async function recoverImageBuildForCleanup(
  db: D1Database,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<string | null> {
  const sandbox = await recoverResourceForCleanup(
    db,
    provider,
    buildSandboxIntent(db, job, true),
  )
  if (sandbox === null) return null
  await assignBuildSandbox(db, job.buildId, sandbox.id, job.providerAccount)
  return sandbox.id
}

async function recoverImageBuildAllocation(
  db: D1Database,
  provider: SandboxProvider,
  job: BuildJob,
  mayHaveAllocated = true,
): Promise<string> {
  const sandbox = await createResource(
    db,
    provider,
    buildSandboxIntent(db, job, mayHaveAllocated),
  )
  await assignBuildSandbox(db, job.buildId, sandbox.id, job.providerAccount)
  return sandbox.id
}
