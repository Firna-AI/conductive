/**
 * The words of the proposal that combines the env vars and the secrets of
 * an org in one tab, Env & secrets (Cal's review of 20 November 2026, and
 * item 2 B, chosen, and items 3 and 4, open). Only the mockups read them. The app keeps
 * the words of `secretsCopy.ts` until the change lands.
 */

import { refusedNameError } from '../../../../../src/ui/components/secrets/secretNameCopy'

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

/** The choice of the type, with the hint of each choice. */
export const kindChoice = {
  label: 'Type',
  secret: 'Secret',
  env: 'Env var',
  secretHint: 'Agents use it in one command after a member allows it.',
  envHint: 'Added to every cloud computer automatically, at each start.',
} as const

/** The Add button and the Add modal, which takes one or more values. */
export const addWords = {
  button: 'Add',
  secretTitle: 'Add secrets',
  envTitle: 'Add env vars',
  name: 'Name',
  value: 'Value',
  addRow: 'Add another',
  removeRow: (index: number) => `Remove row ${index}`,
  /** The hint under the rows: paste several, and the rule of new names. */
  pasteHint: `Paste lines like NAME=value to add several at once. ${refusedNameError}`,
  save: (count: number) => (count === 1 ? 'Add' : `Add ${count}`),
} as const

/** The mark of an env var, which only the Edit modal shows (item 3). */
export const hideWords = {
  label: 'Hide on screen',
  hint: 'Hides the value in agent output and start logs.',
} as const

/** The Edit modal, which also renames the value and changes its type. */
export const editWords = {
  title: (name: string) => `Edit ${name}`,
  name: 'Name',
  newValue: 'New value',
  keepValue: 'Leave it empty to keep the current value.',
  secretNameHint: 'Agents that ask for the old name stop finding it.',
  envNameHint: 'Scripts that read the old name stop finding it.',
  envApplies: 'Changes apply at the next start of each cloud computer.',
  /** The hint of a changed type, which says what Save then does (item 2). */
  toSecret:
    'Cloud computers stop getting it at their next start. Agents then ask before each use.',
  toEnv: 'Every cloud computer gets it at its next start. Its approvals end.',
  save: 'Save',
} as const

/** The items of the menu of a row. */
export const menuWords = {
  label: (name: string) => `More for ${name}`,
  reveal: 'Reveal value',
  edit: 'Edit',
  delete: 'Delete',
} as const
