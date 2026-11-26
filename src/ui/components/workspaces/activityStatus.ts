/**
 * What a workspace is doing. `working` means an agent turn runs, and
 * `unread` means a turn ended with output that the user has not seen.
 * `input` means that the turn waits for the user, such as for the
 * approval of a command on a Mac. All three run on a ready sandbox.
 * `archived` means that Archive stopped its cloud computer, which the app
 * deletes 14 days later, and that its chat is read-only. The other values
 * are the sandbox states.
 */
export type ActivityStatus =
  | 'working'
  | 'input'
  | 'unread'
  | 'ready'
  | 'starting'
  | 'stopped'
  | 'error'
  | 'archived'

/** The states of a run that are not the state of a workspace. */
type RunOnlyState = 'queued' | 'failed' | 'skipped'

export type RunState = ActivityStatus | RunOnlyState
