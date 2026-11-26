import { readOrgProviderAccount } from '../data/org-provider-account'
import { readOrgSwitchContext } from '../operator/switch-context-data'
import { progressProviderSwitch } from './provider-switch-builds'
import { promoteWaitingImageBuild } from './waiting-image-data'
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
  markSwitchPushRefresh,
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
): Promise<readonly string[]> {
  const repositories = await pushedImageRepositories(runtime.env.DB, input)
  const builds: string[] = []
  for (const repository of repositories) {
    if (input.ref !== `refs/heads/${repository.defaultBranch}`) continue
    if (
      await markSwitchPushRefresh(
        runtime.env.DB,
        repository.orgId,
        runtime.dependencies.now(),
      )
    )
      continue
    const providerAccount = await readOrgProviderAccount(
      runtime.env.DB,
      repository.orgId,
    )
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
      await startImageBuild(runtime, {
        orgId: repository.orgId,
        userId: admin.userId,
        // Admission makes the refresh a build while the image holds old values.
        kind: 'refresh',
        software: input.software,
      }),
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
  await promoteWaitingImageBuild(
    runtime.env.DB,
    state.orgId,
    runtime.dependencies.now(),
  )
  const switching = await progressProviderSwitch(runtime, state.orgId)
  if (!(await firstOrgAdmin(runtime.env.DB, state.orgId))) {
    if (
      !(await cleanupOrgImageSources(
        runtime.env,
        runtime.dependencies.fetch,
        state.orgId,
      ))
    )
      throw new Error('Image source access cleanup is pending')
    if (switching) {
      const context = await readOrgSwitchContext(runtime.env.DB, state.orgId)
      if (context.waitReason === 'admin')
        await runtime.scheduler.schedule(
          state.orgId,
          state.software,
          runtime.dependencies.now() + IMAGE_POLL_MS,
          null,
          context.providerAccount,
        )
    }
    return
  }
  const providerAccount = await readOrgProviderAccount(
    runtime.env.DB,
    state.orgId,
  )
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
  if (!admin || !next.imageName) {
    if (switching)
      await runtime.scheduler.schedule(
        state.orgId,
        state.software,
        runtime.dependencies.now() + IMAGE_POLL_MS,
        null,
        providerAccount,
      )
    return
  }
  if (next.pendingAt <= runtime.dependencies.now()) {
    await consumePendingPushRefresh(
      runtime.env.DB,
      state.orgId,
      providerAccount,
      runtime.dependencies.now(),
    )
  }
  await startImageBuild(runtime, {
    orgId: state.orgId,
    userId: admin.userId,
    // Admission makes the refresh a build while the image holds old values.
    kind: 'refresh',
    software: state.software,
    dailyRefresh: next.dailyAt <= runtime.dependencies.now(),
  })
}
