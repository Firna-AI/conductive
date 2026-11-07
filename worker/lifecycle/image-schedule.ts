import { runningBuild } from './build-data'
import type { ImageRuntime } from './image-builds'
import { pendingImageCleanup } from './image-maintenance-data'
import type { ImageSoftwareArtifact } from './image-software'
import { readImageSettings } from './settings-data'
import { imageRetryAt } from './image-retry-data'

export const IMAGE_DAY_MS = 86_400_000
export const IMAGE_POLL_MS = 1_000
export const IMAGE_PUSH_MS = 1_800_000

type ImageSchedule =
  | { buildId: string; nextAt: number }
  | {
      buildId: null
      nextAt: number
      dailyAt: number
      pendingAt: number
      imageName: string | null
    }

/** Every idle caller uses the persisted daily and pending push deadlines. */
export async function readImageSchedule(
  db: D1Database,
  orgId: string,
  now: number,
  requested: { buildId: string | null; nextAt: number },
): Promise<ImageSchedule> {
  const active =
    (await runningBuild(db, orgId)) ?? (await pendingImageCleanup(db, orgId))
  if (active)
    return {
      buildId: active,
      nextAt: await imageRetryAt(
        db,
        active,
        active === requested.buildId ? requested.nextAt : now,
      ),
    }
  const settings = await readImageSettings(db, orgId)
  const dailyAt =
    settings.nextImageRefreshAt ??
    (requested.buildId === null ? requested.nextAt : now + IMAGE_DAY_MS)
  const pendingAt =
    settings.pendingPushRefreshAt === null
      ? Infinity
      : Math.max(
          settings.pendingPushRefreshAt,
          (settings.lastPushRefreshAt ?? -Infinity) + IMAGE_PUSH_MS,
        )
  return {
    buildId: null,
    nextAt: Math.min(dailyAt, pendingAt),
    dailyAt,
    pendingAt,
    imageName: settings.imageName,
  }
}

export async function scheduleIdleImage(
  runtime: ImageRuntime,
  orgId: string,
  software: ImageSoftwareArtifact,
): Promise<void> {
  const now = runtime.dependencies.now()
  const next = await readImageSchedule(runtime.env.DB, orgId, now, {
    buildId: null,
    nextAt: now + IMAGE_DAY_MS,
  })
  await runtime.scheduler.schedule(orgId, software, next.nextAt, next.buildId)
}
