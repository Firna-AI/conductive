import { providerState } from './provider-state'
import type { ImageBuild } from '../../src/shared/org-settings'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import {
  requireActiveUser,
  userSuspended,
  suspendedUserError,
} from '../data/user-access'
import { orgSandboxProvider } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { ProviderError } from '../sandbox/errors'
import { cleanupBuildImageSources } from './image-sources/cleanup'
import { requireOrgMember } from './access'
import {
  assignBuildSnapshot,
  failBuild,
  insertBuild,
  jobSoftware,
  publishBuild,
  readBuildJob,
  runningBuild,
  updateBuildJob,
} from './build-data'
import { advanceBuildCommand, cleanupBuild } from './build-execution'
import { readImageSoftware, type ImageSoftwareArtifact } from './image-software'
import { IMAGE_DAY_MS, scheduleIdleImage } from './image-schedule'
import { allocateImageBuild } from './image-allocation'
import {
  firstOrgAdmin,
  readImageSettings,
  readRepositories,
  selectedRepositories,
  type SelectedRepository,
} from './settings-data'
import {
  capturedRepositoryLocations,
  repositoryLocations,
  readRepositoryLocations,
  type RepositoryLocation,
} from './repository-locations'

export interface ImageScheduler {
  schedule(
    orgId: string,
    software: ImageSoftwareArtifact,
    at: number,
    buildId: string | null,
  ): Promise<void>
}

/** An authorized source transfer may stage private repositories without saved credentials. */
export type PrepareImageSources = (input: {
  orgId: string
  buildId: string
  sandboxId: string
  repositories: readonly SelectedRepository[]
  repositoryLocations?: readonly RepositoryLocation[]
  previousRepositoryLocations?: readonly RepositoryLocation[]
  provider: SandboxProvider
}) => Promise<boolean | void>

export interface ImageRuntime {
  env: AppEnv
  dependencies: AppDependencies
  scheduler: ImageScheduler
  prepareSources: PrepareImageSources
}

export async function startImageBuild(
  runtime: ImageRuntime,
  input: {
    orgId: string
    userId: string
    kind: ImageBuild['kind']
    software: ImageSoftwareArtifact
    dailyRefresh?: boolean
  },
): Promise<string> {
  const { env, dependencies } = runtime
  await requireOrgMember(env.DB, input.orgId, input.userId, true)
  const software = readImageSoftware(input.software)
  const existing = await runningBuild(env.DB, input.orgId)
  if (existing) {
    await runtime.scheduler.schedule(
      input.orgId,
      jobSoftware(await readBuildJob(env.DB, input.orgId, existing)),
      dependencies.now(),
      existing,
    )
    return existing
  }
  const settings = await readImageSettings(env.DB, input.orgId)
  if (input.kind === 'refresh' && !settings.imageName)
    throw new HttpError(
      409,
      'image_required',
      'Build the cloud computer image first.',
    )
  const previous = settings.imageBuildId
    ? await readBuildJob(env.DB, input.orgId, settings.imageBuildId)
    : null
  const previousRepositories = previous
    ? readRepositories(JSON.parse(previous.repositoriesJson))
    : []
  const previousLocations = previous
    ? capturedRepositoryLocations(
        previous.repositoryLocationsJson,
        previousRepositories,
      )
    : []
  const repositories =
    input.kind === 'refresh' && previous
      ? previousRepositories
      : await selectedRepositories(env.DB, input.orgId)
  const locations =
    input.kind === 'refresh' && previous
      ? previousLocations
      : repositoryLocations(repositories)
  const id = dependencies.randomToken()
  const now = dependencies.now()
  try {
    await insertBuild(env.DB, {
      id,
      orgId: input.orgId,
      userId: input.userId,
      kind: input.kind,
      settingsRevision:
        input.kind === 'refresh' && previous
          ? previous.settingsRevision
          : settings.revision,
      installScript: settings.installScript,
      repositories,
      repositoryLocations: locations,
      previousRepositoryLocations: previousLocations,
      software,
      previousImageName: settings.imageName,
      now,
      nextImageRefreshAt:
        input.kind === 'refresh' && input.dailyRefresh
          ? now + IMAGE_DAY_MS
          : undefined,
    })
  } catch (error) {
    const current = await runningBuild(env.DB, input.orgId)
    if (!current) throw error
    await runtime.scheduler.schedule(
      input.orgId,
      jobSoftware(await readBuildJob(env.DB, input.orgId, current)),
      dependencies.now(),
      current,
    )
    return current
  }
  await runtime.scheduler.schedule(
    input.orgId,
    software,
    dependencies.now(),
    id,
  )
  return id
}

/** One durable alarm advances one job. Offsets and logs commit together in D1. */
export async function advanceImageBuild(
  runtime: ImageRuntime,
  orgId: string,
  buildId: string,
): Promise<boolean> {
  const { env, dependencies } = runtime
  let job = await readBuildJob(env.DB, orgId, buildId)
  let provider: SandboxProvider | undefined
  try {
    if (
      (job.phase === 'cleanup' || job.state !== 'running') &&
      !(await cleanupBuildImageSources(env, dependencies.fetch, buildId))
    )
      return false
    const admin = await firstOrgAdmin(env.DB, orgId)
    if (!admin)
      throw new HttpError(404, 'org_not_found', 'The org is not available.')
    provider = await orgSandboxProvider(
      env,
      admin.userId,
      orgId,
      dependencies.fetch,
    )
    if (job.phase === 'cleanup' || job.state !== 'running')
      return await cleanupBuild(runtime, provider, job)
    const recoveringAllocation = job.phase === 'allocating' && !job.sandboxId
    if (
      !recoveringAllocation &&
      job.startedByUserId &&
      (await userSuspended(env.DB, job.startedByUserId))
    )
      throw suspendedUserError()
    if (job.phase === 'create') {
      await updateBuildJob(env.DB, buildId, 'allocating')
      job = { ...job, phase: 'allocating' }
    }
    if (job.phase === 'allocating') {
      if (!recoveringAllocation && job.startedByUserId)
        await requireActiveUser(env.DB, job.startedByUserId)
      await allocateImageBuild(env.DB, provider, job)
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
      const snapshot = job.snapshotName
        ? await provider.getSnapshot(job.snapshotName)
        : await provider.saveSnapshot(job.sandboxId, `image-${buildId}`)
      await assignBuildSnapshot(env.DB, buildId, snapshot.name)
      if (snapshot.status === 'failed') throw new Error('Image save failed')
      if (snapshot.status === 'ready')
        await updateBuildJob(env.DB, buildId, 'publish')
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
        provider,
      })
      if (prepared === false) return false
      await updateBuildJob(
        env.DB,
        buildId,
        job.kind === 'refresh' ? 'snapshot' : 'software',
      )
      return false
    }
    return await advanceBuildCommand(runtime, provider, job)
  } catch (error) {
    if (job.phase === 'cleanup' || job.state !== 'running') throw error
    if (
      provider &&
      job.phase === 'allocating' &&
      !job.sandboxId &&
      !(error instanceof HttpError && error.code === 'user_suspended') &&
      (!(error instanceof ProviderError) ||
        [
          'unavailable',
          'invalid_response',
          'conflict',
          'rate_limited',
        ].includes(error.kind))
    )
      return false
    const message =
      error instanceof HttpError
        ? error.message
        : 'The cloud computer image could not build. Check the log and try again.'
    await failBuild(env.DB, buildId, message, dependencies.now())
    await updateBuildJob(env.DB, buildId, 'cleanup')
    if (!(await cleanupBuildImageSources(env, dependencies.fetch, buildId)))
      return false
    if (!provider) {
      if (job.sandboxId) return false
      await updateBuildJob(env.DB, buildId, 'done')
      await scheduleIdleImage(runtime, orgId, jobSoftware(job))
      return true
    }
    return await cleanupBuild(
      runtime,
      provider,
      await readBuildJob(env.DB, orgId, buildId),
    )
  }
}
