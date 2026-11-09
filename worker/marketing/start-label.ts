import { SITE_START_LABELS } from '../../src/shared/site-build'
import { isOpenSignup } from '../waitlist/data'
import { warnWorker } from '../warnings'

type StartLabel = (typeof SITE_START_LABELS)[keyof typeof SITE_START_LABELS]

interface CachedLabel {
  label: StartLabel
  expiresAt: number
}

/** Cache each database's public action label from the start of its read. */
export function createMarketingStartLabelReader(now: () => number) {
  const labels = new WeakMap<D1Database, CachedLabel>()
  return async (db: D1Database): Promise<StartLabel> => {
    const readAt = now()
    const cached = labels.get(db)
    if (cached && readAt < cached.expiresAt) return cached.label
    try {
      const label = (await isOpenSignup(db))
        ? SITE_START_LABELS.openSignup
        : SITE_START_LABELS.waitlist
      labels.set(db, { label, expiresAt: readAt + 60_000 })
      return label
    } catch {
      warnWorker('The marketing sign-up settings are not available.')
      return SITE_START_LABELS.waitlist
    }
  }
}
