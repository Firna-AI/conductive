import type { LucideIcon } from 'lucide-react'
import { CircleAlert, CirclePause } from 'lucide-react'
import type { ActivityStatus } from '../../fixtures/workspaces'
import type { StatusTone } from '../common/StatusText'

export type StatusPresentation = {
  label: string
  tone: StatusTone
  /** A spinner shows while the sandbox starts or the agent works. */
  busy: boolean
  /** The icon of a state that needs one, in the list and the header. */
  icon?: LucideIcon
  /** An agent turn runs: the list shows the row in bold. */
  active: boolean
  /** The sandbox does not run: the list dims the row. */
  dim: boolean
}

export const activityPresentation: Readonly<
  Record<ActivityStatus, StatusPresentation>
> = {
  working: {
    label: 'Working',
    tone: 'active',
    busy: true,
    active: true,
    dim: false,
  },
  ready: {
    label: 'Ready',
    tone: 'success',
    busy: false,
    active: false,
    dim: false,
  },
  starting: {
    label: 'Starting',
    tone: 'warning',
    busy: true,
    active: false,
    dim: false,
  },
  stopped: {
    label: 'Stopped',
    tone: 'muted',
    busy: false,
    icon: CirclePause,
    active: false,
    dim: true,
  },
  error: {
    label: "Couldn't start",
    tone: 'danger',
    busy: false,
    icon: CircleAlert,
    active: false,
    dim: false,
  },
}
