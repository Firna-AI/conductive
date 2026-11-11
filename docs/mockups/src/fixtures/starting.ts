/**
 * What the app shows while a sandbox starts: the steps so far, and the time
 * since the start began. It also holds the messages that the app saves
 * when a start fails.
 */

import { formatSize } from '../components/chat/sizes'
import { savedCartsOnBranch } from './branches'
import { activationDisk } from './conductorUploads'
import { couponTotals } from './importedWorkspaces'
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

/**
 * A new workspace on a chosen branch starts from the same build, fetches
 * that branch from GitHub, and checks it out with tracking, in place of a
 * new branch.
 */
export const branchStartLog: StartingLog = {
  title: 'Starting the sandbox',
  steps: [
    'Starting from the cloud computer of Acme',
    `Fetching ${savedCartsOnBranch.branch} of acme/storefront`,
    `Checking out ${savedCartsOnBranch.branch} with tracking`,
  ],
  elapsed: '6s',
}

/**
 * The first second of the start of a new workspace, before its title comes:
 * only the first step shows.
 */
export const firstSecondLog: StartingLog = {
  ...creatingLog,
  steps: creatingLog.steps.slice(0, 1),
  elapsed: '1s',
}

/**
 * A workspace from Conductor activates: its first sandbox starts from the
 * newest good build, fetches its branch, copies in the work that GitHub
 * does not hold, and restores the agent memory of each session, so that
 * each one can continue.
 */
export const activationLog: StartingLog = {
  title: 'Activating the workspace',
  steps: [
    'Starting from the cloud computer of Acme',
    `Fetching ${couponTotals.branch} of acme/storefront`,
    'Copying your work from Conductor',
    'Restoring your sessions from Conductor',
  ],
  elapsed: '41s',
}

/** A stopped workspace resumes with its files as they were. */
export const resumingLog: StartingLog = {
  title: 'Resuming the sandbox',
  steps: ['Resuming with your files as you left them'],
  elapsed: '3s',
}

/**
 * Why a start failed: a failure, the 20-minute limit, a chosen branch that
 * is gone from GitHub, or work from Conductor that does not fit the free
 * disk of the cloud computer, which an activation checks first.
 */
export const startErrorKeys = [
  'failed',
  'time-limit',
  'branch-gone',
  'disk-space',
] as const

export type StartError = (typeof startErrorKeys)[number]

/**
 * The message that the app saves for a start that failed. The app shows it
 * as it is, because a start that passed its limit has the same error code.
 */
export const startErrors: Readonly<Record<StartError, string>> = {
  failed: 'The cloud computer could not start. Try again.',
  'time-limit':
    'The cloud computer did not start within the 20-minute limit. Try again.',
  'branch-gone': `The branch ${savedCartsOnBranch.branch} is no longer on GitHub. Restore the branch on GitHub, then try again.`,
  'disk-space': `It needs ${formatSize(activationDisk.needed)} of disk space to unpack your work, and the cloud computer has ${formatSize(activationDisk.free)} free.`,
}
