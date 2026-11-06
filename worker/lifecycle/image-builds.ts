import type { ImageBuild } from '../../src/shared/org-settings'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { lifecycleProvider } from './lifecycle-provider'
import type { SandboxProvider } from '../sandbox/provider'
import { ProviderError } from '../sandbox/errors'
import { requireOrgMember } from './access'
import {
  assignBuildSandbox,
  assignBuildSnapshot,
  failBuild,
  insertBuild,
  jobSoftware,
  publishBuild,
  readBuildJob,
  runningBuild,
  updateBuildJob,
  writeBuildLog,
} from './build-data'
import { advanceBuildCommand, cleanupBuild } from './build-execution'
import { readImageSoftware, type ImageSoftwareArtifact } from './image-software'
import {
  firstOrgAdmin,
  readImageSettings,
  readRepositories,
  selectedRepositories,
  type SelectedRepository,
} from './settings-data'

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
  provider: SandboxProvider
}) => Promise<void>

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
  const repositories =
    input.kind === 'refresh' && settings.imageBuildId
      ? readRepositories(
          JSON.parse(
            (await readBuildJob(env.DB, input.orgId, settings.imageBuildId))
              .repositoriesJson,
          ),
        )
      : await selectedRepositories(env.DB, input.orgId)
  const id = dependencies.randomToken()
  try {
    await insertBuild(env.DB, {
      id,
      orgId: input.orgId,
      userId: input.userId,
      kind: input.kind,
      settingsRevision:
        input.kind === 'refresh' && settings.imageBuildId
          ? (await readBuildJob(env.DB, input.orgId, settings.imageBuildId))
              .settingsRevision
          : settings.revision,
      installScript: settings.installScript,
      repositories,
      software,
      previousImageName: settings.imageName,
      now: dependencies.now(),
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
    const admin = await firstOrgAdmin(env.DB, orgId)
    if (!admin)
      throw new HttpError(404, 'org_not_found', 'The org is not available.')
    provider = await lifecycleProvider(
      env,
      admin.userId,
      orgId,
      dependencies.fetch,
    )
    if (job.phase === 'cleanup' || job.state !== 'running')
      return await cleanupBuild(runtime, provider, job)
    if (job.phase === 'create') {
      const sandbox = await provider.create({
        snapshotName: job.previousImageName ?? undefined,
        name: `image-${job.buildId}`,
        env: {},
        ttlSeconds: 1_800,
        idempotencyKey: `image-${job.buildId}`,
        labels: { org: orgId, build: buildId },
      })
      await assignBuildSandbox(env.DB, buildId, sandbox.id)
      await updateBuildJob(env.DB, buildId, 'sources')
      return false
    }
    if (!job.sandboxId) throw new Error('Missing build sandbox')
    const machine = await provider.get(job.sandboxId)
    if (
      ['init', 'provisioning', 'provisioned', 'cloning'].includes(machine.state)
    )
      return false
    if (['error', 'archived', 'cancelled'].includes(machine.state))
      throw new Error('Image sandbox did not start')
    if (!['ready', 'idle', 'running'].includes(machine.state)) return false
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
      await writeBuildLog(
        env.DB,
        buildId,
        'Updating the repositories.\n',
        dependencies.now(),
      )
      await runtime.prepareSources({
        orgId,
        buildId,
        sandboxId: job.sandboxId,
        repositories: readRepositories(JSON.parse(job.repositoriesJson)),
        provider,
      })
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
      job.phase === 'create' &&
      !job.sandboxId &&
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
    if (!provider) {
      if (job.sandboxId) return false
      await updateBuildJob(env.DB, buildId, 'done')
      await runtime.scheduler.schedule(
        orgId,
        jobSoftware(job),
        dependencies.now() + 86_400_000,
        null,
      )
      return true
    }
    return await cleanupBuild(
      runtime,
      provider,
      await readBuildJob(env.DB, orgId, buildId),
    )
  }
}
