/**
 * What the app shows while a sandbox starts: the steps so far, and the time
 * since the start began. It also holds the messages that the app saves
 * when a start fails.
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

/**
 * Each create and resume runs for at most 20 minutes from its start, with
 * the startup script and every retry.
 */
export const startLimit = 'Each start has a 20-minute limit.'

/** Why a start failed: a failure, or the 20-minute limit. */
export const startErrorKeys = ['failed', 'time-limit'] as const

export type StartError = (typeof startErrorKeys)[number]

/**
 * The message that the app saves for a start that failed. The app shows it
 * as it is, because a start that passed its limit has the same error code.
 */
export const startErrors: Readonly<Record<StartError, string>> = {
  failed: 'The cloud computer could not start. Try again.',
  'time-limit':
    'The cloud computer did not start within the 20-minute limit. Try again.',
}
