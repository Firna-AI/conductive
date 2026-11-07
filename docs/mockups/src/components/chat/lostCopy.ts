/**
 * The words of the chat for data that it does not have: a runner event that
 * the workspace refused, and the part of a tool's output or of a turn's file
 * list that the runner left out. The words name the lost data in product
 * terms, and never show the refused data itself. A line can follow a newer
 * turn, so no words point at "this turn".
 */

import { formatSize } from './sizes'

/** The data that a refused event carried, in the words of the chat. */
export type LostWhat =
  | 'turn-start'
  | 'status'
  | 'reply-part'
  | 'reply'
  | 'tool-update'
  | 'turn-end'
  | 'turn-error'
  | 'all-files'
  | 'changes'
  | 'start-steps'
  | 'title'
  | 'agent-update'
  | 'update'

/** Why the workspace refused it. The values are those of the chat events. */
export type LostReason = 'too_large' | 'invalid' | 'turn_not_active'

const subjects: Readonly<Record<LostWhat, string>> = {
  'turn-start': 'The start of a turn',
  status: 'A status update from the agent',
  'reply-part': 'Part of a reply from the agent',
  reply: 'A reply from the agent',
  'tool-update': 'A tool update',
  'turn-end': 'The summary of a turn',
  'turn-error': 'The error of a turn',
  'all-files': 'An update to All files',
  changes: 'An update to Changes',
  'start-steps': 'An update to the start steps',
  title: 'The new workspace name',
  'agent-update': 'An update from an agent',
  update: 'An update from the cloud computer',
}

const causes: Readonly<Record<LostReason, string>> = {
  too_large: 'it was too large',
  invalid: 'it could not be read',
  turn_not_active: 'its turn never started',
}

/**
 * The one line of a refused event, such as "A tool update was lost because
 * it was too large".
 */
export function lostText(what: LostWhat, reason: LostReason): string {
  return `${subjects[what]} was lost because ${causes[reason]}`
}

/** The files of a turn past the ones that the chat lists: "47 more files". */
export function moreFiles(count: number): string {
  return `${count} more ${count === 1 ? 'file' : 'files'}`
}

/** The output that the runner left out of one tool call: "1.2 MB left out". */
export function leftOutOfCall(bytes: number): string {
  return `${formatSize(bytes)} left out`
}

/** The output left out of a run of tool calls: "1.2 MB of output left out". */
export function leftOutOfRun(bytes: number): string {
  return `${formatSize(bytes)} of output left out`
}

/**
 * The files that a stopped turn changed past the ones that the runner
 * listed. A stopped turn shows no file list, so the words name the files.
 */
export function unlistedFiles(count: number): string {
  return `${count} changed ${count === 1 ? 'file' : 'files'} not listed`
}

/**
 * Workspace data that stays unavailable after a failed repair: an update
 * without a session was lost, and the fresh full report that should replace
 * it was lost too. The first loss shows nothing.
 */
export type UnavailableData = Extract<LostWhat, 'changes' | 'title'>

const unavailable: Readonly<Record<UnavailableData, string>> = {
  changes: 'The latest list of changes is unavailable',
  title: 'The new workspace name is unavailable',
}

/** The words of a failed-repair notice, which name the unavailable data. */
export function unavailableText(data: UnavailableData): string {
  return unavailable[data]
}
