import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { runnerSoftware } from '../configuration'
import type { ImageSoftwareArtifact } from './image-software'
import { runningBuild } from './build-data'
import {
  advanceImageBuild,
  startImageBuild,
  type ImageRuntime,
} from './image-builds'
import {
  IMAGE_POLL_MS,
  IMAGE_PUSH_MS,
  readImageSchedule,
} from './image-schedule'
import { firstActiveOrgAdmin, firstOrgAdmin } from './settings-data'
import { cleanupOrgImageSources } from './image-sources/cleanup'
import { imageRetryAt } from './image-retry-data'
import { readOrgImage } from './org-image-data'
import {
  claimPushRefresh,
  consumePendingPushRefresh,
  markPendingPushRefresh,
  pushedImageRepositories,
} from './org-image-refresh-data'

export { IMAGE_POLL_MS } from './image-schedule'

/** Only the verified GitHub webhook dispatcher calls this entry point. */
export async function refreshImagesForPush(
  runtime: ImageRuntime,
  input: {
    githubRepositoryId: number
    installationId?: number
    ref: string
    software: ImageSoftwareArtifact
  },
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<readonly string[]> {
  const repositories = await pushedImageRepositories(
    runtime.env.DB,
    input,
    providerAccount,
  )
  const builds: string[] = []
  for (const repository of repositories) {
    if (input.ref !== `refs/heads/${repository.defaultBranch}`) continue
    const admin = await firstActiveOrgAdmin(runtime.env.DB, repository.orgId)
    if (!admin) continue
    const image = await readOrgImage(
      runtime.env.DB,
      repository.orgId,
      providerAccount,
    )
    if (
      image?.lastPushRefreshAt != null &&
      image.lastPushRefreshAt > runtime.dependencies.now() - IMAGE_PUSH_MS
    )
      continue
    if (await runningBuild(runtime.env.DB, repository.orgId)) {
      await markPendingPushRefresh(
        runtime.env.DB,
        repository.orgId,
        providerAccount,
        runtime.dependencies.now(),
      )
      continue
    }
    const claimed = await claimPushRefresh(
      runtime.env.DB,
      repository.orgId,
      providerAccount,
      runtime.dependencies.now(),
      runtime.dependencies.now() - IMAGE_PUSH_MS,
    )
    if (!claimed) continue
    builds.push(
      await startImageBuild(
        runtime,
        {
          orgId: repository.orgId,
          userId: admin.userId,
          kind: 'refresh',
          refreshCause: 'push',
          software: input.software,
        },
        providerAccount,
      ),
    )
  }
  return builds
}

export interface ImageCoordinatorState {
  orgId: string
  providerAccount?: string
  software: ImageSoftwareArtifact
  buildId: string | null
  nextAt: number
}

/** Called by the namespaced org-image Durable Object's real alarm. */
export async function runImageAlarm(
  runtime: ImageRuntime,
  state: ImageCoordinatorState,
): Promise<void> {
  const providerAccount = state.providerAccount ?? DEFAULT_PROVIDER_ACCOUNT
  if (!(await firstOrgAdmin(runtime.env.DB, state.orgId))) {
    if (
      !(await cleanupOrgImageSources(
        runtime.env,
        runtime.dependencies.fetch,
        state.orgId,
      ))
    )
      throw new Error('Image source access cleanup is pending')
    return
  }
  const next = await readImageSchedule(
    runtime.env.DB,
    state.orgId,
    runtime.dependencies.now(),
    state,
    providerAccount,
  )
  if (next.buildId !== null) {
    const done = await advanceImageBuild(runtime, state.orgId, next.buildId)
    if (!done)
      await runtime.scheduler.schedule(
        state.orgId,
        state.software,
        await imageRetryAt(
          runtime.env.DB,
          next.buildId,
          runtime.dependencies.now() + IMAGE_POLL_MS,
        ),
        next.buildId,
        providerAccount,
      )
    return
  }
  if (next.nextAt > runtime.dependencies.now()) {
    await runtime.scheduler.schedule(
      state.orgId,
      state.software,
      next.nextAt,
      null,
      providerAccount,
    )
    return
  }
  const admin = await firstActiveOrgAdmin(runtime.env.DB, state.orgId)
  if (!admin || !next.imageName) return
  if (next.pendingAt <= runtime.dependencies.now()) {
    await consumePendingPushRefresh(
      runtime.env.DB,
      state.orgId,
      providerAccount,
      runtime.dependencies.now(),
    )
  }
  await startImageBuild(
    runtime,
    {
      orgId: state.orgId,
      userId: admin.userId,
      kind: 'refresh',
      software:
        runtime.env.CONDUCTIVE_RUNNER_ARCHIVE_URL === undefined &&
        runtime.env.CONDUCTIVE_RUNNER_ARCHIVE_SHA256 === undefined
          ? state.software
          : runnerSoftware(runtime.env),
      dailyRefresh: next.dailyAt <= runtime.dependencies.now(),
      refreshCause:
        next.dailyAt <= runtime.dependencies.now() ? 'daily' : 'push',
    },
    providerAccount,
  )
}
