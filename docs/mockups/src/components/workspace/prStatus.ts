import type { LucideIcon } from 'lucide-react'
import { CircleCheck, CircleX, GitMerge } from 'lucide-react'
import {
  checksByState,
  mergedInto,
  reviewByState,
  type BannerState,
} from '../../fixtures/pullRequests'

export type PrTone = 'neutral' | 'success' | 'danger'

export type PrStatus = {
  /** A spinner shows while checks run. */
  busy: boolean
  icon?: LucideIcon
  text: string
  /** More detail, which a wide bar shows after the text. */
  detail?: string
  tone: PrTone
}

/** The state of an open pull request, as its bar and its row show it. */
export function prStatus(state: Exclude<BannerState, 'none'>): PrStatus {
  const checks = checksByState[state]
  const failed = checks.filter((check) => check.state === 'failed').length
  const done = checks.filter((check) => check.state !== 'running').length
  const review = reviewByState[state]
  switch (state) {
    case 'checks-running':
      return {
        busy: true,
        text: 'Checks running',
        detail: `${done} of ${checks.length}`,
        tone: 'neutral',
      }
    case 'checks-failed':
      return {
        busy: false,
        icon: CircleX,
        text: `${failed} checks failed`,
        tone: 'danger',
      }
    case 'ready-to-merge':
      return {
        busy: false,
        icon: CircleCheck,
        text: 'Ready to merge',
        detail: review,
        tone: 'success',
      }
    case 'merged':
      return {
        busy: false,
        icon: GitMerge,
        text: `Merged into ${mergedInto.branch}`,
        detail: mergedInto.when,
        tone: 'neutral',
      }
  }
}
