import { requireActiveOrg } from '../data/user-access'
import { HttpError } from '../http'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { runningBuild } from './build-data'
import type { ImageRuntime } from './image-builds'
import { pendingImageCleanup } from './image-maintenance-data'
import type { ImageSoftwareArtifact } from './image-software'
import { readOrgImage } from './org-image-data'
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
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
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
  const image = await readOrgImage(db, orgId, providerAccount)
  const dailyAt =
    image?.nextImageRefreshAt ??
    (requested.buildId === null ? requested.nextAt : now + IMAGE_DAY_MS)
  const pendingAt =
    image?.pendingPushRefreshAt == null
      ? Infinity
      : Math.max(
          image.pendingPushRefreshAt,
          (image.lastPushRefreshAt ?? -Infinity) + IMAGE_PUSH_MS,
        )
  return {
    buildId: null,
    nextAt: Math.min(dailyAt, pendingAt),
    dailyAt,
    pendingAt,
    imageName: image?.imageName ?? null,
  }
}

/** Pending cleanup stays scheduled while suspension disables idle refresh. */
export async function scheduleIdleImage(
  runtime: ImageRuntime,
  orgId: string,
  software: ImageSoftwareArtifact,
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<void> {
  const now = runtime.dependencies.now()
  const next = await readImageSchedule(
    runtime.env.DB,
    orgId,
    now,
    { buildId: null, nextAt: now + IMAGE_DAY_MS },
    providerAccount,
  )
  if (next.buildId === null) {
    try {
      await requireActiveOrg(runtime.env.DB, orgId)
    } catch (error) {
      if (error instanceof HttpError && error.code === 'org_suspended') return
      throw error
    }
  }
  await runtime.scheduler.schedule(
    orgId,
    software,
    next.nextAt,
    next.buildId,
    providerAccount,
  )
}
