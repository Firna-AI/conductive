import type { LucideIcon } from 'lucide-react'
import {
  CircleAlert,
  CircleArrowRight,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleSlash,
  CircleX,
  TimerOff,
} from 'lucide-react'
import type { GitHubCheck } from '../shared/github'

export type CheckState = GitHubCheck['state']
type CheckTone = 'success' | 'danger' | 'warning' | 'muted'

export interface CheckLook {
  /** The words of the state. */
  label: string
  /** A running check shows a spinner in place of an icon. */
  icon: LucideIcon | null
  tone: CheckTone
  /** A finished check shows how long it ran. */
  finished: boolean
}

/** The words, the icon, and the colour of each check state of the contract. */
export const checkLooks: Readonly<Record<CheckState, CheckLook>> = {
  queued: {
    label: 'Queued',
    icon: CircleDashed,
    tone: 'muted',
    finished: false,
  },
  running: { label: 'Running', icon: null, tone: 'muted', finished: false },
  passed: {
    label: 'Passed',
    icon: CircleCheck,
    tone: 'success',
    finished: true,
  },
  failed: { label: 'Failed', icon: CircleX, tone: 'danger', finished: true },
  cancelled: {
    label: 'Cancelled',
    icon: CircleSlash,
    tone: 'muted',
    finished: true,
  },
  skipped: {
    label: 'Skipped',
    icon: CircleArrowRight,
    tone: 'muted',
    finished: true,
  },
  neutral: {
    label: 'Neutral',
    icon: CircleMinus,
    tone: 'muted',
    finished: true,
  },
  'action-required': {
    label: 'Action required',
    icon: CircleAlert,
    tone: 'warning',
    finished: true,
  },
  'timed-out': {
    label: 'Timed out',
    icon: TimerOff,
    tone: 'danger',
    finished: true,
  },
}

export function isFinishedCheck(check: GitHubCheck): boolean {
  return checkLooks[check.state].finished
}

/** A check that timed out failed too. A cancelled or skipped check did not. */
export function isFailedCheck(check: GitHubCheck): boolean {
  return check.state === 'failed' || check.state === 'timed-out'
}
