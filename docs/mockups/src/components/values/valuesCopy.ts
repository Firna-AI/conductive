/**
 * The words of the proposal that combines the env vars and the secrets of
 * an org in the Secrets tab (items 1 B, 2 C, 3 B, and 4 B of 17 November
 * 2026, open). Only the mockups read them. The app keeps the words of
 * `secretsCopy.ts` until Cal answers.
 */

import { refusedNameError } from '../secrets/secretNameCopy'

/** The two kinds of a value: how it reaches the agents. */
export const kindWords = {
  start: 'Each start',
  approval: 'After approval',
} as const

/** The choice of the kind in the Add secret form, with a hint for each. */
export const kindChoice = {
  label: 'How agents get it',
  approvalHint:
    'Agents use it in one command after a member allows it. The chat hides it.',
  startHint: (org: string) =>
    `Every cloud computer of ${org} gets it at each start, with no question.`,
} as const

/** The hint of the name of a value for each start, with the rule of new names. */
export const startNameHint = `Programs read the value by this name. ${refusedNameError}`

/** What the tab is for, under its title. */
export function valuesIntro(org: string): string {
  return `Named values for the cloud computers and agents of ${org}. Each one reaches them at each start, or after a member allows it.`
}

/** The mark of a value for each start, which was "Secret" (item 3 B). */
export const hideWords = {
  label: 'Hide on screen',
  hint: 'Hides the value in agent output and start logs.',
} as const

/** The notes under the list. */
export const valuesNotes = {
  start:
    'Changes to values for each start apply at the next start of each cloud computer.',
  member:
    'Only admins add and change values for each start. You can change and delete the secrets that you added.',
} as const

/** The Rename form of a row. */
export const renameWords = {
  label: 'New name',
  save: 'Rename',
  approvalHint: (name: string) =>
    `Agents that ask for ${name} stop finding it. Its approvals and reveal record stay.`,
  startHint: (name: string) =>
    `Cloud computers get the new name at their next start. Scripts that read ${name} stop finding it.`,
} as const

/** The labels of the actions of a row. */
export const rowActionLabels = {
  rename: (name: string) => `Rename ${name}`,
  change: (name: string) => `Change the value of ${name}`,
  move: (name: string) => `Move ${name} to ${kindWords.approval}`,
} as const

/** The question before Move (item 2 C). */
export const moveWords = {
  title: (name: string) => `Move ${name} to ${kindWords.approval}?`,
  body: 'Cloud computers stop getting it at their next start. Agents then ask before each use, and admins can reveal it.',
  owner: 'You become the member who added it.',
  confirm: 'Move',
} as const

/** The line of the Cloud computer tab, where the env vars were. */
export const computerNote = {
  title: 'Environment variables',
  before: 'Values for each start are on the ',
  link: 'Secrets',
  after: ' tab.',
} as const
