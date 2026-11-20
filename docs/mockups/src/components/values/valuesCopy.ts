/**
 * The words of the proposal that combines the env vars and the secrets of
 * an org in one tab, Env & secrets (Cal's review of 20 November 2026, and
 * items 2 C, 3 B, and 4 B, open). Only the mockups read them. The app keeps
 * the words of `secretsCopy.ts` until the change lands.
 */

import { refusedNameError } from '../secrets/secretNameCopy'

/** The name of the tab, which was Secrets. */
export const tabTitle = 'Env & secrets'

/** The badge of each kind of value. */
export const kindWords = {
  env: 'Env',
  secret: 'Secret',
} as const

/** What the tab is for, under its title. */
export const valuesIntro =
  'Env vars are added to every cloud computer automatically. Agents use a secret after a member allows it.'

/** The choice of the kind in the Add modal, with the hint of each choice. */
export const kindChoice = {
  label: 'Type',
  secret: 'Secret',
  env: 'Env var',
  secretHint: 'Agents use it in one command after a member allows it.',
  envHint: 'Added to every cloud computer automatically, at each start.',
} as const

/** The Add button and the titles of the Add modal. */
export const addWords = {
  button: 'Add',
  secretTitle: 'New secret',
  envTitle: 'New env var',
  save: 'Add',
} as const

/** The hint of the name of an env var, with the rule of new names. */
export const envNameHint = `Programs read the value by this name. ${refusedNameError}`

/** The mark of an env var, which was "Secret" (item 3 B). */
export const hideWords = {
  label: 'Hide on screen',
  hint: 'Hides the value in agent output and start logs.',
} as const

/** The Edit modal, which also renames the value. */
export const editWords = {
  title: (name: string) => `Edit ${name}`,
  name: 'Name',
  newValue: 'New value',
  keepValue: 'Leave it empty to keep the current value.',
  secretNameHint: 'Agents that ask for the old name stop finding it.',
  envNameHint: 'Scripts that read the old name stop finding it.',
  envApplies: 'Changes apply at the next start of each cloud computer.',
  save: 'Save',
} as const

/** The items of the menu of a row. */
export const menuWords = {
  label: (name: string) => `More for ${name}`,
  reveal: 'Reveal value',
  edit: 'Edit',
  move: 'Move to secrets',
  delete: 'Delete',
} as const

/** The question before Move (item 2 C). */
export const moveWords = {
  title: (name: string) => `Move ${name} to secrets?`,
  body: 'Cloud computers stop getting it at their next start. Agents then ask before each use, and admins can reveal it.',
  owner: 'You become the member who added it.',
  confirm: 'Move',
} as const
