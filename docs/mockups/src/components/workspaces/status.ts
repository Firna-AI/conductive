import type { ActivityStatus } from '../../fixtures/workspaces'

/**
 * How a row title shows its state: strong for output that the user has not
 * read, active while an agent works, and dim while the sandbox is stopped.
 */
export type RowEmphasis = 'strong' | 'active' | 'normal' | 'dim'

export type StatusPresentation = {
  /** The state in words: the header shows it, and screen readers hear it. */
  label: string
  emphasis: RowEmphasis
}

export const activityPresentation: Readonly<
  Record<ActivityStatus, StatusPresentation>
> = {
  working: { label: 'Working', emphasis: 'active' },
  input: { label: 'Needs input', emphasis: 'active' },
  unread: { label: 'Done, unread', emphasis: 'strong' },
  ready: { label: 'Ready', emphasis: 'normal' },
  starting: { label: 'Starting', emphasis: 'normal' },
  stopped: { label: 'Stopped', emphasis: 'dim' },
  error: { label: "Couldn't start", emphasis: 'normal' },
  archived: { label: 'Archived', emphasis: 'dim' },
}
