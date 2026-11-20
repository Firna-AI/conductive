import { insertBuild } from './build-admission-data'
import { HttpError } from '../http'
import { readOrgProviderAccount } from '../data/org-provider-account'
import { latestSoftwareRelease } from './software-release'
import { softwareVersion } from '../software-image/version'
import {
  jobSoftware,
  readBuildJob,
  runningBuild,
  type BuildJob,
} from './build-data'
import { readImageSoftware } from './image-software'
import { IMAGE_DAY_MS } from './image-schedule'
import { readOrgImage } from './org-image-data'
import { failUnscheduledBuild } from './image-build-failure'
import {
  readImageSettings,
  readRepositories,
  selectedRepositories,
} from './settings-data'
import {
  capturedRepositoryLocations,
  repositoryLocations,
} from './repository-locations'
import { waitingImageBuild } from './waiting-image-data'
import { startImageBuild, type ImageRuntime } from './image-builds'
import type { ImageBuild } from '../../src/shared/org-settings'
import type { ImageSoftwareArtifact } from './image-software'

export interface ImageBuildRequest {
  orgId: string
  userId: string
  kind: ImageBuild['kind']
  software: ImageSoftwareArtifact
  dailyRefresh?: boolean
}

export async function admitImageBuild(
  runtime: ImageRuntime,
  input: ImageBuildRequest,
  executing: BuildJob | null,
): Promise<string> {
  const { env, dependencies } = runtime
  const providerAccount = await readOrgProviderAccount(env.DB, input.orgId)
  const software = readImageSoftware(input.software)
  const waitingSwitchId = executing?.operatorSwitchId ?? undefined
  const settings = await readImageSettings(env.DB, input.orgId)
  const image = await readOrgImage(env.DB, input.orgId, providerAccount)
  if (input.kind === 'refresh' && !image?.imageName)
    throw new HttpError(
      409,
      'image_required',
      'Build the cloud computer image first.',
    )
  const previous = image?.imageBuildId
    ? await readBuildJob(env.DB, input.orgId, image.imageBuildId)
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
    const inserted = await insertBuild(env.DB, {
      id,
      waitingForSwitchId: waitingSwitchId,
      orgId: input.orgId,
      providerAccount,
      expectedOrgAccount: providerAccount,
      previousProviderAccount: previous?.providerAccount ?? providerAccount,
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
      softwareVersion:
        input.kind === 'build' && !image?.imageName
          ? await softwareVersion(
              await latestSoftwareRelease(env, dependencies.fetch),
            )
          : undefined,
      previousImageName: image?.imageName ?? null,
      now,
      nextImageRefreshAt:
        input.kind === 'refresh' && input.dailyRefresh
          ? now + IMAGE_DAY_MS
          : undefined,
    })
    if (!inserted) {
      const waiting = await waitingImageBuild(env.DB, input.orgId)
      if (waiting) return waiting.id
      return startImageBuild(runtime, input)
    }
  } catch (error) {
    const waiting = await waitingImageBuild(env.DB, input.orgId)
    if (waiting) return waiting.id
    const current = await runningBuild(env.DB, input.orgId)
    if (!current) throw error
    const job = await readBuildJob(env.DB, input.orgId, current)
    if (job.operatorSwitchId) {
      if (waitingSwitchId) throw error
      return startImageBuild(runtime, input)
    }
    await runtime.scheduler.schedule(
      input.orgId,
      jobSoftware(job),
      dependencies.now(),
      current,
      job.providerAccount,
    )
    return current
  }
  try {
    await runtime.scheduler.schedule(
      input.orgId,
      software,
      dependencies.now(),
      executing?.buildId ?? id,
      executing?.providerAccount ?? providerAccount,
    )
  } catch (error) {
    await failUnscheduledBuild(runtime, id)
    throw error
  }
  return id
}
