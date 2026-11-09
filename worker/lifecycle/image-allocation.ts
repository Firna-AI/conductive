import type { SandboxProvider } from '../sandbox/provider'
import { assignBuildSandbox, type BuildJob } from './build-data'
import { completeBuildPhase } from './build-phase-data'
import { buildSandboxIntent, createResource } from './resource-intents'

export async function allocateImageBuild(
  db: D1Database,
  provider: SandboxProvider,
  job: BuildJob,
  mayHaveAllocated: boolean,
): Promise<void> {
  await recoverImageBuildAllocation(db, provider, job, mayHaveAllocated)
  await completeBuildPhase(db, job.buildId, 'sources')
}

export async function recoverImageBuildAllocation(
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
  await assignBuildSandbox(db, job.buildId, sandbox.id)
  return sandbox.id
}
