import type { ReactNode } from 'react'
import { Loader } from '@firna/ui/loader'
import { CircleCheck, CircleX } from 'lucide-react'
import {
  checksByState,
  mergedInto,
  type BannerState,
} from '../../fixtures/pullRequests'
import styles from './GitHubBanner.module.css'

export type BannerTone = 'muted' | 'primary' | 'danger'

export const bannerToneClass: Readonly<Record<BannerTone, string>> = {
  muted: styles.muted,
  primary: styles.primary,
  danger: styles.danger,
}

export type BannerStatus = {
  /** An icon before the text, when the state needs one. */
  icon?: ReactNode
  /** The text that the desktop layout shows. */
  text: string
  /** The shorter text of the mobile row: the state that matters most. */
  short: string
  /** More detail that only the desktop layout shows. */
  detail?: string
  tone: BannerTone
  badge?: { text: string; tone: 'primary' | 'neutral' }
}

/** The checks and merge state of a pull request in each banner state. */
export function bannerStatus(
  state: Exclude<BannerState, 'none'>,
): BannerStatus {
  const checks = checksByState[state]
  switch (state) {
    case 'checks-running':
      return {
        icon: <Loader accessibilityLabel="Checks running" size={14} />,
        text: 'Checks running',
        short: 'Checks running',
        detail: `${checks.done} of ${checks.total} done`,
        tone: 'muted',
      }
    case 'checks-failed':
      return {
        icon: <CircleX className={styles.danger} size={16} />,
        text: `${checks.failed.length} checks failed`,
        short: `${checks.failed.length} checks failed`,
        detail: checks.failed.join(', '),
        tone: 'danger',
      }
    case 'ready-to-merge':
      return {
        icon: <CircleCheck className={styles.primary} size={16} />,
        text: `${checks.total} checks passed`,
        short: 'Ready to merge',
        detail: 'Approved',
        tone: 'primary',
        badge: { text: 'Ready to merge', tone: 'primary' },
      }
    case 'merged':
      return {
        text: `Merged into ${mergedInto.branch}`,
        short: `Merged into ${mergedInto.branch}`,
        detail: mergedInto.when,
        tone: 'primary',
        badge: { text: 'Merged', tone: 'neutral' },
      }
  }
}
