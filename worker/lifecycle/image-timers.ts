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
import {
  firstActiveOrgAdmin,
  firstOrgAdmin,
  readImageSettings,
} from './settings-data'
import { cleanupOrgImageSources } from './image-sources/cleanup'
import { imageRetryAt } from './image-retry-data'

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
  const { results } = await runtime.env.DB.prepare(
    `SELECT r.org_id AS orgId, json_extract(entry.value, '$.defaultBranch') AS defaultBranch
     FROM settings s JOIN image_build_jobs j ON j.build_id = COALESCE(s.image_build_id,
       (SELECT id FROM image_builds WHERE org_id = s.org_id AND state = 'running'))
     JOIN json_each(j.repositories_json) entry
     JOIN repositories r ON r.id = json_extract(entry.value, '$.id') AND r.org_id = s.org_id
     JOIN orgs ON orgs.id = r.org_id WHERE r.github_repository_id = ? AND orgs.deleted_at IS NULL
     AND (? IS NULL OR EXISTS (SELECT 1 FROM github_installations i
       WHERE i.id = r.installation_id AND i.id = ? AND i.suspended_at IS NULL))`,
  )
    .bind(
      input.githubRepositoryId,
      input.installationId ?? null,
      input.installationId ?? null,
    )
    .all<{ orgId: string; defaultBranch: string }>()
  const builds: string[] = []
  for (const repository of results) {
    if (input.ref !== `refs/heads/${repository.defaultBranch}`) continue
    const admin = await firstActiveOrgAdmin(runtime.env.DB, repository.orgId)
    if (!admin) continue
    const settings = await readImageSettings(runtime.env.DB, repository.orgId)
    if (
      settings.lastPushRefreshAt !== null &&
      settings.lastPushRefreshAt > runtime.dependencies.now() - IMAGE_PUSH_MS
    )
      continue
    if (await runningBuild(runtime.env.DB, repository.orgId)) {
      await runtime.env.DB.prepare(
        'UPDATE settings SET pending_push_refresh_at = COALESCE(pending_push_refresh_at, ?) WHERE org_id = ?',
      )
        .bind(runtime.dependencies.now(), repository.orgId)
        .run()
      continue
    }
    const claim = await runtime.env.DB.prepare(
      `UPDATE settings SET last_push_refresh_at = ?, pending_push_refresh_at = NULL WHERE org_id = ?
       AND org_image_name IS NOT NULL
       AND (last_push_refresh_at IS NULL OR last_push_refresh_at <= ?)`,
    )
      .bind(
        runtime.dependencies.now(),
        repository.orgId,
        runtime.dependencies.now() - IMAGE_PUSH_MS,
      )
      .run()
    if (!claim.meta.changes) continue
    builds.push(
      await startImageBuild(runtime, {
        orgId: repository.orgId,
        userId: admin.userId,
        kind: 'refresh',
        software: input.software,
      }),
    )
  }
  return builds
}

export interface ImageCoordinatorState {
  orgId: string
  software: ImageSoftwareArtifact
  buildId: string | null
  nextAt: number
}

/** Called by the namespaced org-image Durable Object's real alarm. */
export async function runImageAlarm(
  runtime: ImageRuntime,
  state: ImageCoordinatorState,
): Promise<void> {
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
      )
    return
  }
  if (next.nextAt > runtime.dependencies.now()) {
    await runtime.scheduler.schedule(
      state.orgId,
      state.software,
      next.nextAt,
      null,
    )
    return
  }
  const admin = await firstActiveOrgAdmin(runtime.env.DB, state.orgId)
  if (!admin || !next.imageName) return
  if (next.pendingAt <= runtime.dependencies.now()) {
    await runtime.env.DB.prepare(
      'UPDATE settings SET pending_push_refresh_at = NULL, last_push_refresh_at = ? WHERE org_id = ?',
    )
      .bind(runtime.dependencies.now(), state.orgId)
      .run()
  }
  await startImageBuild(runtime, {
    orgId: state.orgId,
    userId: admin.userId,
    kind: 'refresh',
    software: state.software,
    dailyRefresh: next.dailyAt <= runtime.dependencies.now(),
  })
}
