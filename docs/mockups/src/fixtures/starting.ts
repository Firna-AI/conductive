/**
 * What the app shows while a sandbox starts: the steps so far, and the time
 * since the start began.
 */

import { savedCarts } from './workspaces'

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
    `Creating branch ${savedCarts.branch}`,
  ],
  elapsed: '6s',
}

/** A stopped workspace resumes with its files as they were. */
export const resumingLog: StartingLog = {
  title: 'Resuming the sandbox',
  steps: ['Resuming with your files as you left them'],
  elapsed: '3s',
}

/**
 * The second message that the user writes while the sandbox of the new
 * workspace starts for the first time. The composer keeps it until the user
 * sends it.
 */
export const heldDraft =
  'Keep a saved cart for 30 days after its last change, then delete it.'
