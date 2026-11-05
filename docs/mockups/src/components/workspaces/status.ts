import type { ActivityStatus } from '../../fixtures/workspaces'

/** A tone that both the Firna badge and status dot accept. */
export type StatusTone = 'neutral' | 'primary' | 'warning' | 'danger'

export type StatusPresentation = {
  label: string
  tone: StatusTone
  pulse: boolean
  /** A dim dot, for a sandbox that does not run. */
  dim: boolean
  /** Whether a list row also shows when the workspace was last active. */
  showsTime: boolean
}

export const activityPresentation: Readonly<
  Record<ActivityStatus, StatusPresentation>
> = {
  working: {
    label: 'Working',
    tone: 'primary',
    pulse: true,
    dim: false,
    showsTime: false,
  },
  ready: {
    label: 'Ready',
    tone: 'primary',
    pulse: false,
    dim: false,
    showsTime: true,
  },
  starting: {
    label: 'Starting',
    tone: 'warning',
    pulse: true,
    dim: false,
    showsTime: false,
  },
  stopped: {
    label: 'Stopped',
    tone: 'neutral',
    pulse: false,
    dim: true,
    showsTime: true,
  },
  error: {
    label: "Couldn't start",
    tone: 'danger',
    pulse: false,
    dim: false,
    showsTime: true,
  },
}
