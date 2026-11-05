/**
 * What the app shows while a sandbox starts: the steps so far, and the time
 * since the start began.
 */

export type StartingLog = {
  title: string
  steps: readonly string[]
  elapsed: string
}

/** A new workspace starts from the newest good base of its repository. */
export const creatingLog: StartingLog = {
  title: 'Starting the sandbox',
  steps: ['Starting from the newest base', 'Creating branch cal/saved-carts'],
  elapsed: '6s',
}

/** A stopped workspace resumes with its files as they were. */
export const resumingLog: StartingLog = {
  title: 'Resuming the sandbox',
  steps: ['Resuming with your files as you left them'],
  elapsed: '3s',
}
