import { insertBuild } from './build-admission-data'
import type { ImageBuild } from '../../src/shared/org-settings'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import {
  requireActiveOrg,
  requireActiveUser,
  userSuspended,
} from '../data/user-access'
import { orgSandboxProvider, sandboxProvider } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { ProviderError } from '../sandbox/errors'
import {
  nextProviderRetry,
  providerRetryPending,
  providerRetryExpired,
  ProviderRetryExhausted,
} from './provider-retry'
import {
  progressImageRetry,
  saveImageRetry,
  clearImageRetryStatement,
} from './image-retry-data'
import { readSourceJob } from './image-sources/source-data'
import { imageSourceFailure } from './image-sources/materialize'
import { advanceBuildStep } from './image-build-steps'
import { cleanupBuildImageSources } from './image-sources/cleanup'
import type { SourceCommandPort } from './image-sources/source-commands'
import { requireOrgMember } from './access'
import {
  failBuild,
  jobSoftware,
  readBuildJob,
  runningBuild,
  updateBuildJob,
} from './build-data'
import { cleanupBuild } from './build-execution'
import { readImageSoftware, type ImageSoftwareArtifact } from './image-software'
import { IMAGE_DAY_MS, scheduleIdleImage } from './image-schedule'
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
  commands: SourceCommandPort
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
  await requireActiveOrg(env.DB, input.orgId)
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
  const recoveringAllocation = job.phase === 'allocating' && !job.sandboxId
  try {
    if (job.phase === 'sources' && job.state === 'running') {
      const source = await readSourceJob(env.DB, buildId)
      if (source && (source.failed || source.phase === 'abort')) {
        await clearImageRetryStatement(env.DB, buildId).run()
        if (!(await cleanupBuildImageSources(env, dependencies.fetch, buildId)))
          return false
        throw imageSourceFailure()
      }
    }
    if (
      !recoveringAllocation &&
      job.state === 'running' &&
      job.phase !== 'cleanup'
    )
      await requireActiveOrg(env.DB, orgId)
    const suspended =
      !recoveringAllocation &&
      job.state === 'running' &&
      job.phase !== 'cleanup' &&
      job.startedByUserId !== null &&
      (await userSuspended(env.DB, job.startedByUserId))
    if (
      job.state === 'running' &&
      job.phase !== 'cleanup' &&
      !suspended &&
      providerRetryPending(job.providerRetry, dependencies.now())
    )
      return false
    if (
      (job.phase === 'cleanup' || job.state !== 'running') &&
      !(await cleanupBuildImageSources(env, dependencies.fetch, buildId))
    )
      return false
    if (job.phase === 'cleanup' || job.state !== 'running')
      return await cleanupBuild(
        runtime,
        sandboxProvider(env, dependencies.fetch),
        job,
      )
    const admin = await firstOrgAdmin(env.DB, orgId)
    if (!admin)
      throw new HttpError(404, 'org_not_found', 'The org is not available.')
    provider = await orgSandboxProvider(
      env,
      admin.userId,
      orgId,
      dependencies.fetch,
    )
    if (!recoveringAllocation && job.startedByUserId)
      await requireActiveUser(env.DB, job.startedByUserId)
    if (providerRetryExpired(job.providerRetry, dependencies.now()))
      throw new ProviderRetryExhausted()
    const done = await advanceBuildStep(runtime, provider, job)
    if (!done) await progressImageRetry(env.DB, buildId)
    return done
  } catch (error) {
    job = await readBuildJob(env.DB, orgId, buildId)
    if (job.phase === 'cleanup' || job.state !== 'running') throw error
    const retry = nextProviderRetry(
      job.providerRetry,
      error,
      dependencies.now(),
    )
    if (retry) {
      await saveImageRetry(env.DB, buildId, retry)
      return false
    }
    if (
      provider &&
      job.phase === 'allocating' &&
      !job.sandboxId &&
      !(
        error instanceof HttpError &&
        ['user_suspended', 'org_suspended'].includes(error.code)
      ) &&
      !(error instanceof ProviderRetryExhausted) &&
      !(error instanceof ProviderError)
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
