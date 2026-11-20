import { productName } from '../../brand'

/**
 * The words of the Secrets tab of the org settings (secrets decisions 2,
 * 3, and 6). The app and the mockups take them from here.
 */
export const secretsWords = {
  title: 'Secrets',
  add: 'Add secret',
  save: 'Save secret',
  cancel: 'Cancel',
  allAgents: 'All agents',
  copy: 'Copy',
  hide: 'Hide',
  newValue: 'New value',
  /** The hint of the value of the Replace form. */
  keepValue: 'Leave it empty to keep the current value.',
  none: 'No secrets yet.',
  name: 'Name',
  description: 'Description',
  value: 'Value',
  nameHint: 'Agents ask for the secret by this name.',
  descriptionHint: 'Members read it when an agent asks for the secret.',
  valueHint: `${productName} keeps it encrypted. Only admins can reveal it.`,
  /** The note under the list: what the mark for all agents does. */
  allAgentsNote:
    'Agents use a secret for All agents in every workspace, with no question.',
  /** The note under the list of a member, who changes only their own secrets. */
  memberNote: 'You can replace and delete the secrets that you added.',
  delete: 'Delete secret',
  deleteBody:
    'Agents can no longer use it, and its approvals end in every workspace.',
} as const

/** What the tab is for, under its title. */
export const secretsIntro =
  'Agents run a command with a secret after a member allows it. They get only its name, and the chat hides its value.'

/**
 * The line that says when to use the env vars instead. The tab links the
 * words of `link` to the Cloud computer tab.
 */
export const envVarsNote = {
  before:
    'For values that every cloud computer needs at each start, use environment variables on the ',
  link: 'Cloud computer',
  after: ' tab.',
} as const

/** The hint of the switch for all agents in the Add secret form. */
export function allAgentsHint(org: string): string {
  return `Every agent of ${org} can use it with no question.`
}

/** Who added a secret. */
export function addedBy(who: string): string {
  return `Added by ${who}`
}

/** The record of the last reveal of a value. */
export function revealedBy(who: string, when: string): string {
  return `Revealed by ${who}, ${when}`
}

/** The question before Delete. */
export function deleteTitle(name: string): string {
  return `Delete ${name}?`
}
