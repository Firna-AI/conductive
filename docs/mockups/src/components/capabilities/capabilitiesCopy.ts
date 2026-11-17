/**
 * The words of the Capabilities control of New workspace and of a
 * workspace (secrets decisions 6 and 8). The app and the mockups take them
 * from here.
 */

/** The label of the icon on hover, and the title of the control. */
export const capabilitiesLabel = 'Capabilities'

/** The line under the title: what the control holds. */
export const capabilitiesIntro = {
  create: 'What agents in the new workspace can use.',
  workspace: 'What agents in this workspace can use.',
} as const

export const secretsPartWords = {
  title: 'Secrets',
  hint: 'Agents use a pre-approved secret with no question.',
  manage: 'Manage secrets',
  allAgents: 'All agents',
  add: 'Add a secret',
  sessions: 'Allowed in sessions',
  values: 'Values for this workspace',
  remove: 'Remove',
} as const

/** The line of an org without secrets. */
export function noSecrets(org: string): string {
  return `${org} has no secrets yet.`
}

/** What a session approval says: its session, who allowed it, and when. */
export function approvalDetail(
  session: string,
  who: string,
  when: string,
): string {
  return `${session} · by ${who}, ${when}`
}

/** What a value for the workspace says: who gave it, and when. */
export function valueDetail(who: string, when: string): string {
  return `Given by ${who}, ${when}`
}

export const macAccessWords = {
  title: 'Mac access',
  hint: 'Lets agents ask to run commands on the Mac of the member who sent the message.',
} as const
