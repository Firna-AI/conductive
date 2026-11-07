import type { SandboxProvider } from '../sandbox/provider'
import { assignBuildSandbox, updateBuildJob, type BuildJob } from './build-data'
import { buildSandboxIntent, createResource } from './resource-intents'

export async function allocateImageBuild(
  db: D1Database,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<void> {
  const sandbox = await createResource(provider, buildSandboxIntent(db, job))
  await assignBuildSandbox(db, job.buildId, sandbox.id)
  await updateBuildJob(db, job.buildId, 'sources')
}
