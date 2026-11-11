/**
 * What the app shows while a sandbox starts: the steps so far, and the time
 * since the start began. It also holds the messages that the app saves
 * when a start fails.
 */

import { updatingSoftware } from '../components/workspace/updateCopy'
import { savedCarts } from './workspaces'

export type StartingLog = {
  title: string
  steps: readonly string[]
  elapsed: string
  /**
   * A step that failed while the start goes on, such as the update of the
   * agent and terminal software. The card marks it.
   */
  failedStep?: string
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
 * The first second of the start of a new workspace, before its title comes:
 * only the first step shows.
 */
export const firstSecondLog: StartingLog = {
  ...creatingLog,
  steps: creatingLog.steps.slice(0, 1),
  elapsed: '1s',
}

/** A stopped workspace resumes with its files as they were. */
export const resumingLog: StartingLog = {
  title: 'Resuming the sandbox',
  steps: ['Resuming with your files as you left them'],
  elapsed: '3s',
}

/**
 * A workspace with an earlier version of the agent and terminal software
 * resumes. The update runs right after the resume, before the agent
 * starts.
 */
export const updatingLog: StartingLog = {
  ...resumingLog,
  steps: [...resumingLog.steps, updatingSoftware],
  elapsed: '18s',
}

/**
 * A new workspace whose org image holds an earlier version of the agent
 * and terminal software, such as in the day after a release. The update
 * runs right after the start from the org image.
 */
export const creatingUpdateLog: StartingLog = {
  ...creatingLog,
  steps: [
    creatingLog.steps[0],
    updatingSoftware,
    ...creatingLog.steps.slice(1),
  ],
  elapsed: '34s',
}

/**
 * A start whose update failed. The start goes on with the earlier version
 * of the agent and terminal software, and the card marks the step.
 */
export function failedUpdate(log: StartingLog): StartingLog {
  return { ...log, elapsed: '41s', failedStep: updatingSoftware }
}

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
