/**
 * What the app shows while a sandbox starts: the steps so far, and the time
 * since the start began.
 */

export type StartingLog = {
  title: string
  steps: readonly string[]
  elapsed: string
}

/**
 * A new workspace starts from the newest good build of the org's cloud
 * computer, which holds every repository of the org.
 */
export const creatingLog: StartingLog = {
  title: 'Starting the sandbox',
  steps: [
    'Starting from the cloud computer of Acme',
    'Fetching main of acme/storefront',
    'Creating branch cal/lisbon-7k2q',
  ],
  elapsed: '6s',
}

/** A stopped workspace resumes with its files as they were. */
export const resumingLog: StartingLog = {
  title: 'Resuming the sandbox',
  steps: ['Resuming with your files as you left them'],
  elapsed: '3s',
}
