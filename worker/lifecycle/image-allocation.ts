import type { SandboxProvider } from '../sandbox/provider'
import { assignBuildSandbox, updateBuildJob, type BuildJob } from './build-data'
import { readRepositories } from './settings-data'
import {
  capturedRepositoryLocations,
  repositoryEnvironment,
} from './repository-locations'

export async function allocateImageBuild(
  db: D1Database,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<void> {
  const sandbox = await provider.create({
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
  })
  await assignBuildSandbox(db, job.buildId, sandbox.id)
  await updateBuildJob(db, job.buildId, 'sources')
}
