/**
 * The failures and the skips of the migration job on the Providers tab of
 * the operator (own computer decision 7 D), as the operator route of the
 * job gives them. This module imports no fixture, so the app can use it
 * too.
 */

/** The step of the job that failed on a machine. */
type FailedStep = 'restart' | 'brief-start' | 'refresh'

/**
 * The causes that the job tells apart for each step, from the rules of
 * that step, and `unknown` when the job has no cause:
 * - A restart downloads the release of the Worker, then restarts the
 *   runner, which must be ready within 3 minutes, as Restart does.
 * - A brief start installs the release, as the bootstrap does, and ends
 *   when the host program connects within its 30 minutes.
 * - A refresh has the 60-minute limit of each refresh of an org image.
 */
type StepCauses = {
  restart: 'download' | 'restart' | 'not-ready' | 'unknown'
  'brief-start': 'download' | 'no-connection' | 'unknown'
  refresh: 'time-limit' | 'unknown'
}

/** A failed step with one cause of that step. */
export type StepFailure = {
  [Step in FailedStep]: { step: Step; cause: StepCauses[Step] }
}[FailedStep]

/**
 * A step that failed: its org, the workspace number and the cloud computer
 * ID of its machine, which an org image has none of, its step with its
 * cause, and when.
 */
export type JobFailure = StepFailure & {
  org: string
  number?: number
  computer?: string
  at: string
}

/** Why the job skipped a machine, as the job reports it. */
export type SkipReason =
  | 'suspended'
  | 'deleted-org'
  | 'restore-ends'
  | 'no-sandbox'
  | 'provider-error'
  | 'creating'
  | 'not-configured'

/**
 * What went wrong so far: each failed step, the skips of each reason, and
 * the orgs with no active admin, whose org images get no refresh.
 */
export type JobProblems = {
  failures: readonly JobFailure[]
  skips: Readonly<Record<SkipReason, number>>
  noAdmin: readonly string[]
}
