/**
 * The words of the Capabilities control of New workspace, of a workspace,
 * and of an automation (secrets decisions 6 and 8, and automation
 * capabilities decision 1). The app and the mockups take them from here.
 */

/** The label of the icon on hover, and the title of the control. */
export const capabilitiesLabel = 'Capabilities'

/** The line under the title: what the control holds. */
export const capabilitiesIntro = {
  create: 'What agents in the new workspace can use.',
  workspace: 'What agents in this workspace can use.',
  automation: 'What agents in each run can use.',
} as const

export const secretsPartWords = {
  title: 'Secrets',
  /** The hint of the part in the control of an automation. */
  automationHint:
    'Each run workspace starts with the checked secrets pre-approved, so agents use them with no question.',
  manage: 'Manage secrets',
  allAgents: 'All agents',
  add: 'Add a secret',
  session: 'This session',
  values: 'Values for this workspace',
  remove: 'Remove',
  /** The label and the placeholder of the search above a long list. */
  search: 'Search secrets',
} as const

/** The line of an org without secrets. */
export function noSecrets(org: string): string {
  return `${org} has no secrets yet.`
}

/** The name of the info icon that shows the description of a secret. */
export function aboutSecret(name: string): string {
  return `About ${name}`
}

/** The line of a search that no secret matches. */
export function noSecretMatch(search: string): string {
  return `No secret matches “${search.trim()}”.`
}

/**
 * What an approval of the open session says: who allowed it, and when. The
 * title of its group names the session.
 */
export function approvalDetail(who: string, when: string): string {
  return `Allowed by ${who}, ${when}`
}

/** What a value for the workspace says: who gave it, and when. */
export function valueDetail(who: string, when: string): string {
  return `Given by ${who}, ${when}`
}

/**
 * The Mac access part, which only the Mac app shows. Its one switch has no
 * hint (Mac access decision 7).
 */
export const macAccessWords = {
  title: 'Mac access',
} as const

/**
 * The words of this Mac in the Mac access part. In the Mac app, the switch
 * starts or stops a grant until Stop of the workspace on this Mac (Mac
 * access decision 7). The part shows only short results: Not started with
 * its cause, and This Mac is not available. The notice of a new workspace
 * whose grant did not start has its own title and Try again.
 */
export const thisMacWords = {
  /**
   * The words under the switch, off and disabled, while the page cannot
   * read this Mac.
   */
  notAvailableHint: 'This Mac is not available.',
  /** The title of the result of a start that failed. */
  notStarted: 'Not started',
  /** Why a start failed when it found this Mac not available. */
  notAvailable:
    'This Mac is not available, so each command still asks first. Try again once it connects.',
  /** The notice in a new workspace whose grant did not start. */
  noticeTitle: 'Could not allow all commands on this Mac',
  tryAgain: 'Try again',
  tryAgainLabel: 'Try again to allow all commands on this Mac',
} as const

/**
 * The lines under the prompt of an automation, which every member reads.
 * The first names the secrets that each run workspace pre-approves, between
 * `lead` and `tail`. The hint follows it while the triggers have a pull
 * request trigger (automation capabilities decision 3 A).
 */
export const runSecretsWords = {
  lead: 'Runs can use',
  tail: 'with no question.',
  pullRequest:
    'Text in a pull request, such as a comment, can steer the agent to use these secrets.',
} as const
