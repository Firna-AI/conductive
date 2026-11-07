import type { SandboxProvider } from '../sandbox/provider'
import type { BuildJob } from './build-data'
import {
  assignBuildSandbox,
  assignBuildSnapshot,
  publishBuild,
  readBuildJob,
} from './build-data'
import { advanceBuildCommand, cleanupBuild } from './build-execution'
import { completeBuildPhase } from './build-phase-data'
import { clearBuildCommands } from './command-intents'
import type { ImageRuntime } from './image-builds'
import { SourceCommandPort } from './image-sources/source-commands'
import { providerState } from './provider-state'
import {
  buildSandboxIntent,
  buildSnapshotIntent,
  createResource,
} from './resource-intents'
import {
  capturedRepositoryLocations,
  readRepositoryLocations,
} from './repository-locations'
import { readRepositories } from './settings-data'

export async function advanceBuildStep(
  runtime: ImageRuntime,
  provider: SandboxProvider,
  job: BuildJob,
): Promise<boolean> {
  const { env, dependencies } = runtime
  const { buildId, orgId } = job
  if (job.phase === 'create') {
    const sandbox = await createResource(
      provider,
      buildSandboxIntent(env.DB, job),
    )
    await assignBuildSandbox(env.DB, buildId, sandbox.id)
    await completeBuildPhase(env.DB, buildId, 'sources')
    return false
  }
  if (!job.sandboxId) throw new Error('Missing build sandbox')
  const machine = await provider.get(job.sandboxId)
  const status = providerState(machine.state)
  if (status === 'error' || status === 'stopped')
    throw new Error('Image sandbox did not start')
  if (status !== 'ready') return false
  // A long build receives the same safety deadline as other active work.
  await provider.setAutoStop(job.sandboxId, 1_800)
  if (job.phase === 'snapshot') {
    if (job.kind === 'build' && job.snapshotName === null)
      await clearBuildCommands(provider, job.sandboxId, job.buildId)
    const snapshot = await createResource(
      provider,
      buildSnapshotIntent(env.DB, job),
    )
    await assignBuildSnapshot(env.DB, buildId, snapshot.name)
    if (snapshot.status === 'failed') throw new Error('Image save failed')
    if (snapshot.status === 'ready')
      await completeBuildPhase(env.DB, buildId, 'publish')
    return false
  }
  if (job.phase === 'publish') {
    await publishBuild(env.DB, job, dependencies.now())
    job = await readBuildJob(env.DB, orgId, buildId)
    return await cleanupBuild(runtime, provider, job)
  }
  if (job.phase === 'sources') {
    const prepared = await runtime.prepareSources({
      orgId,
      buildId,
      sandboxId: job.sandboxId,
      repositories: readRepositories(JSON.parse(job.repositoriesJson)),
      repositoryLocations: capturedRepositoryLocations(
        job.repositoryLocationsJson,
        readRepositories(JSON.parse(job.repositoriesJson)),
      ),
      previousRepositoryLocations:
        job.previousRepositoryLocationsJson === null
          ? undefined
          : readRepositoryLocations(
              JSON.parse(job.previousRepositoryLocationsJson),
            ),
      commands: new SourceCommandPort(provider, job.sandboxId),
    })
    if (prepared === false) return false
    await completeBuildPhase(
      env.DB,
      buildId,
      job.kind === 'refresh' ? 'snapshot' : 'software',
    )
    return false
  }
  return await advanceBuildCommand(runtime, provider, job)
}
