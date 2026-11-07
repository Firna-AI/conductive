import type { SandboxProvider } from '../sandbox/provider'
import { assignBuildSandbox, type BuildJob } from './build-data'
import { completeBuildPhase } from './build-phase-data'
import { buildSandboxIntent, createResource } from './resource-intents'

export async function allocateImageBuild(
  db: D1Database,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<void> {
  const sandbox = await createResource(provider, buildSandboxIntent(db, job))
  await assignBuildSandbox(db, job.buildId, sandbox.id)
  await completeBuildPhase(db, job.buildId, 'sources')
}
